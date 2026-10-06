/**
 * Byte-stability helpers: the provider's prompt cache hits only on an exact
 * prefix match, so any drift in what the engine sends is a guaranteed miss.
 * These functions detect that drift; they send nothing and change nothing.
 */

/**
 * @param value any JSON-like value
 * @returns canonical string with sorted keys; the engine's `handle` dropped so
 * identity metadata never counts as content drift
 */
export function stableStringify(value: unknown): string {
  const seen = new Set<object>()

  function encode(node: unknown): string {
    if (node === null || typeof node !== 'object') {
      const text = JSON.stringify(node)
      return text === undefined ? 'undefined' : text
    }
    if (seen.has(node)) {
      return '"[circular]"'
    }
    seen.add(node)
    if (Array.isArray(node)) {
      return `[${node.map(encode).join(',')}]`
    }
    const record = node as Record<string, unknown>
    const keys = Object.keys(record)
      .filter((key) => key !== 'handle')
      .sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${encode(record[key])}`).join(',')}}`
  }

  try {
    return encode(value)
  } catch {
    return String(value)
  }
}

/**
 * @param text canonical text
 * @returns 8-hex-digit FNV-1a over UTF-16 units; sync and dependency-free on
 * purpose, so hooks never wait on crypto for a change-detection hash
 */
export function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * @param messages transcript messages in `$.session.messages()` shape
 * @returns one content hash per message, order preserved
 */
export function fingerprintMessages(messages: readonly unknown[]): string[] {
  return messages.map((message) => fnv1a(stableStringify(message)))
}

export type CompactAudit = {
  kept: number
  dropped: number
  added: number
}

/**
 * @param before content hashes going into compaction
 * @param after content hashes coming out of it
 * @returns multiset diff: kept, dropped, added
 */
export function auditCompact(before: readonly string[], after: readonly string[]): CompactAudit {
  const remaining = new Map<string, number>()
  for (const hash of after) {
    remaining.set(hash, (remaining.get(hash) ?? 0) + 1)
  }
  let kept = 0
  for (const hash of before) {
    const count = remaining.get(hash) ?? 0
    if (count > 0) {
      kept++
      remaining.set(hash, count - 1)
    }
  }
  let added = 0
  for (const count of remaining.values()) {
    added += count
  }
  return { kept, dropped: before.length - kept, added }
}

export function evidenceKey(at: number): string {
  return `compact-evidence:${at}`
}

export function auditKey(at: number): string {
  return `compact-audit:${at}`
}

/**
 * @param keys every key in the plugin store, insertion ordered
 * @param prefix only keys under this prefix are managed, foreign keys untouched
 * @param keep how many newest snapshots survive
 * @returns keys to delete, oldest first
 */
export function pruneKeys(keys: readonly string[], prefix: string, keep: number): string[] {
  const owned = keys.filter((key) => key.startsWith(prefix))
  const stamped = owned
    .map((key) => ({ key, at: Number(key.slice(prefix.length)) }))
    .filter((entry) => Number.isFinite(entry.at))
    .sort((a, b) => b.at - a.at)
  return stamped.slice(keep).map((entry) => entry.key)
}

export type CustodyAudit = {
  appended: number
  dropped: number[]
  moved: boolean
}

/**
 * @param prev content hashes at the end of the previous turn
 * @param curr content hashes now
 * @returns append-only check: previously seen messages must survive in order.
 * `dropped` names previous indexes that vanished, `moved` flags a reorder,
 * `appended` counts genuinely new tail messages.
 */
export function auditCustody(prev: readonly string[], curr: readonly string[]): CustodyAudit {
  const dropped: number[] = []
  let cursor = 0
  for (let i = 0; i < prev.length; i++) {
    const found = curr.indexOf(prev[i] as string, cursor)
    if (found === -1) {
      dropped.push(i)
    } else {
      cursor = found + 1
    }
  }
  const matched = prev.length - dropped.length
  const isPrefix = matched === prev.length && curr.slice(0, prev.length).every((hash, i) => hash === prev[i])
  return { appended: curr.length - matched, dropped, moved: matched > 0 && !isPrefix }
}

/**
 * @param message one transcript message
 * @returns short `[role] head...` preview for violation logs; never throws,
 * never dumps full tool results into the transcript
 */
export function previewMessage(message: unknown): string {
  if (typeof message === 'object' && message !== null) {
    const record = message as Record<string, unknown>
    const role = typeof record.role === 'string' ? record.role : '?'
    const raw = typeof record.text === 'string' ? record.text : stableStringify(record.text)
    const flat = raw.replace(/\s+/g, ' ')
    const head = flat.length > 80 ? `${flat.slice(0, 80)}...` : flat
    return `[${role}] ${head}`
  }
  return stableStringify(message).slice(0, 80)
}

export type ApiUsage = {
  input_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  output_tokens: number
}

/**
 * @param text section or context text as the engine composed it
 * @returns text with the volatile parts normalized: ISO datetimes collapse to
 * their date, clock times to 00:00, CRLF to LF. Dates stay (useful), the
 * ever-ticking clock goes (pure cache poison). Code-shaped text without
 * timestamps passes through untouched.
 */
export function normalizeVolatile(text: string): string {
  return text
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g, (match) => match.slice(0, 10))
    .replace(/\b\d{2}:\d{2}(?::\d{2})?\b/g, '00:00')
    .replace(/\r\n/g, '\n')
}

export type Stabilized = {
  text: string
  pinned: boolean
  drifted: boolean
}

/**
 * @param previous the text this key last settled on, absent on first sight
 * @param current the text the engine composed just now
 * @returns pinned text when only volatile parts moved (a free hit saved),
 * current text with drift flagged when content really changed
 */
export function stabilize(previous: string | undefined, current: string): Stabilized {
  if (previous === undefined || previous === current) {
    return { text: current, pinned: false, drifted: false }
  }
  if (normalizeVolatile(previous) === normalizeVolatile(current)) {
    return { text: previous, pinned: true, drifted: false }
  }
  return { text: current, pinned: false, drifted: true }
}

/**
 * @param api the last response's token counts as the API reported them
 * @returns one log line, e.g. `cache read 18000/20000 input (90%), created 0, output 320`
 */
export function cacheLine(api: ApiUsage): string {
  const total = api.input_tokens + api.cache_creation_input_tokens + api.cache_read_input_tokens
  const pct = total === 0 ? 100 : Math.round((api.cache_read_input_tokens / total) * 100)
  return `cache read ${api.cache_read_input_tokens}/${total} input (${pct}%), created ${api.cache_creation_input_tokens}, output ${api.output_tokens}`
}

/**
 * @param api the last response's token counts
 * @returns true when nothing was served from cache despite a non-empty request
 */
export function isColdMiss(api: ApiUsage): boolean {
  return api.cache_read_input_tokens === 0 && api.input_tokens + api.cache_creation_input_tokens > 0
}
