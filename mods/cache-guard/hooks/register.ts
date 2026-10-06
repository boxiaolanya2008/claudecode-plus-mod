import type { On } from 'claude-code'

import {
  auditCompact,
  auditCustody,
  auditKey,
  cacheLine,
  evidenceKey,
  fingerprintMessages,
  isColdMiss,
  previewMessage,
  pruneKeys,
  stabilize,
} from './fingerprint'

type GuardOptions = {
  verbose?: boolean
  forbidAutoCompact?: boolean
  dropAttachmentTypes?: string[]
}

function report($: unknown, message: string, verbose: boolean): void {
  const ui = ($ as { ui: { log: (text: string, opts?: object) => void } }).ui
  if (verbose) {
    ui.log(message)
  } else {
    ui.log(message, { to: 'debug' })
  }
}

/**
 * Registers cache-prefix stabilization. The provider matches on exact prefix
 * and the engine places every cache mark itself, so nothing here forces a
 * hit. What it does is erase the misses we cause ourselves: volatile-only
 * drift in recomposed sections and context blocks is pinned back to the
 * last settled text, real content changes pass through with a warning, and
 * per-turn numbers prove the delta.
 *
 * @param on the engine's registrar
 * @param options `verbose` surfaces each line in the transcript;
 * `forbidAutoCompact` vetoes threshold-triggered compaction;
 * `dropAttachmentTypes` leaves named attachment types out of the request
 */
export function register(on: On, options: GuardOptions = {}): void {
  const verbose = options.verbose === true
  const settledSections = new Map<string, string>()
  const settledBlocks = new Map<string, string>()
  const dropped = new Set(options.dropAttachmentTypes ?? [])
  let lastChain: string[] | undefined
  let lastPreview: string[] = []

  on('session.start', ($, e, next) => {
    report($, '[cache-guard] active, watching session.measure, prompt.section, prompt.context, turn.complete, session.compact', verbose)
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    try {
      const usage = await $.session.usage({ breakdown: 'summary' })
      const api = usage.breakdown?.apiUsage
      if (api !== undefined && api !== null) {
        report($, `[cache-guard] ${cacheLine(api)}`, verbose)
        if (isColdMiss(api)) {
          report($, '[cache-guard] cold miss: nothing served from cache this turn, the request prefix changed', verbose)
        }
      }
    } catch {
      report($, '[cache-guard] usage unavailable, skipping cache report', verbose)
    }
    return result
  })

  on('prompt.section', async ($, e, next) => {
    const out = await next(e)
    if (out.text === null) {
      return out
    }
    const stable = stabilize(settledSections.get(e.name), out.text)
    settledSections.set(e.name, stable.text)
    if (stable.pinned) {
      report($, `[cache-guard] section "${e.name}" pinned to last settled text, volatile-only drift erased`, verbose)
    } else if (stable.drifted) {
      report($, `[cache-guard] section "${e.name}" content changed, next request prefix will miss cache`, verbose)
    }
    return { text: stable.text }
  })

  on('prompt.context', async ($, e, next) => {
    const out = await next(e)
    const blocks = out.blocks.map((block) => {
      const stable = stabilize(settledBlocks.get(block.name), block.text)
      settledBlocks.set(block.name, stable.text)
      if (stable.pinned) {
        report($, `[cache-guard] context block "${block.name}" pinned to last settled text`, verbose)
      } else if (stable.drifted) {
        report($, `[cache-guard] context block "${block.name}" content changed`, verbose)
      }
      return { ...block, text: stable.text }
    })
    return { ...out, blocks }
  })

  on('prompt.attachment', async ($, e, next) => {
    if (dropped.has(e.type)) {
      report($, `[cache-guard] attachment "${e.type}" dropped by dropAttachmentTypes`, verbose)
      return { text: null }
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined) {
      return result
    }
    try {
      const messages = await $.session.messages()
      const curr = fingerprintMessages(messages)
      const preview = messages.map(previewMessage)
      if (lastChain === undefined) {
        report($, `[cache-guard] custody baseline: ${curr.length} messages`, verbose)
      } else {
        const audit = auditCustody(lastChain, curr)
        if (audit.dropped.length > 0 || audit.moved) {
          const ui = ($ as { ui: { log: (text: string) => void } }).ui
          for (const index of audit.dropped) {
            ui.log(`[cache-guard] custody violation: message #${index} vanished between turns: ${lastPreview[index] ?? ''}`)
          }
          if (audit.moved) {
            ui.log('[cache-guard] custody violation: message order changed between turns')
          }
        } else {
          report($, `[cache-guard] custody ok: ${curr.length} messages, +${audit.appended} appended, none lost`, verbose)
        }
      }
      lastChain = curr
      lastPreview = preview
    } catch {
      report($, '[cache-guard] custody check skipped, messages unreadable', verbose)
    }
    return result
  })

  if (options.forbidAutoCompact === true) {
    on('session.compact', { trigger: 'auto' }, () => ({
      skip: '[cache-guard] auto-compact vetoed by forbidAutoCompact; run /compact manually when ready',
    }))
  }

  on('session.compact', async ($, e, next) => {
    const before = fingerprintMessages(e.messages)
    let at: number
    try {
      at = await $.clock.now()
    } catch {
      at = Date.now()
    }

    let evidence = 'store-unavailable'
    try {
      await $.store.set(evidenceKey(at), { trigger: e.trigger, at, messages: e.messages })
      const keys = await $.store.keys()
      for (const key of pruneKeys(keys, 'compact-evidence:', 2)) {
        await $.store.delete(key)
      }
      evidence = `full snapshot of ${e.messages.length} messages`
    } catch {
      try {
        await $.store.set(evidenceKey(at), { trigger: e.trigger, at, fingerprints: before })
        evidence = `fingerprints only, full text over store limit`
      } catch {
        evidence = 'store-unavailable'
      }
    }

    const result = await next(e)
    if (!('messages' in result) || result.messages === undefined) {
      report($, `[cache-guard] compact (${e.trigger}) skipped`, verbose)
      return result
    }
    const after = fingerprintMessages(result.messages)
    const audit = auditCompact(before, after)
    try {
      await $.store.set(auditKey(at), { trigger: e.trigger, at, before: before.length, after: after.length, audit })
      const keys = await $.store.keys()
      for (const key of pruneKeys(keys, 'compact-audit:', 10)) {
        await $.store.delete(key)
      }
    } catch {
      report($, '[cache-guard] audit record not stored', verbose)
    }
    report(
      $,
      `[cache-guard] compact (${e.trigger}): ${before.length} -> ${after.length} messages, ` +
        `kept ${audit.kept}, dropped ${audit.dropped}, added ${audit.added}; evidence locked (${evidence}); prefix cache resets after compact`,
      verbose,
    )
    return result
  })
}
