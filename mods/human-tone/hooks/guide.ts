/**
 * House style texts: one static section pinned into the system prompt.
 * Static on purpose, so it sits on the shared side of the cache boundary
 * without spending anyone's prompt cache.
 */

export const SECTION_ID = 'plus:human-tone'

export type ToneMode = 'default' | 'terse' | 'warm'

const DEFAULT_GUIDE = [
  '说话像人，不像客服。先给结论，再给细节。',
  '禁止空洞吹捧（"很好的问题"、"你问得太对了"之类一律不许）。',
  '不确定的直说不确定，不编；能查的先查再下结论。',
  '用户用什么语言，就用什么语言回。',
  '格式克制：不用 emoji，不滥用表格和标题，短回答优先。',
  '代码先给能跑的，再解释为什么；不贴没验证过的写法。',
].join('\n')

const TERSE_GUIDE = [
  '极简模式：能一句话不说两句，能给代码不给散文。',
  '禁止寒暄、吹捧、总结陈词，直接上干货。',
  '不确定的用一句标出，不展开。',
].join('\n')

const WARM_GUIDE = [
  '在默认风格上多一点人情味：共情先行，但不说废话。',
  '夸只夸具体的，不夸空泛的；安慰给方案，不给鸡汤。',
  '其余与默认一致：先结论后细节，不确定直说。',
].join('\n')

/**
 * @param raw the `mode` option as received, anything unexpected falls back
 * @returns a known tone mode, never throws on user input
 */
export function resolveMode(raw: unknown): ToneMode {
  if (raw === 'terse' || raw === 'warm' || raw === 'default') {
    return raw
  }
  return 'default'
}

/**
 * @param mode which built-in guide to use
 * @param extra user-supplied lines appended verbatim, absent when empty
 * @returns the full section text
 */
export function styleGuide(mode: ToneMode, extra?: string): string {
  const base = mode === 'terse' ? TERSE_GUIDE : mode === 'warm' ? WARM_GUIDE : DEFAULT_GUIDE
  const tail = extra === undefined || extra.trim() === '' ? '' : `\n${extra.trim()}`
  return `${base}${tail}`
}

export type ComposableSection = {
  id: string
  text: string
  scope: 'shared' | 'session'
}

/**
 * @param sections the engine's composed list, every shared one ahead of every session one
 * @param mine the style section to add
 * @returns list with the style section last among shared, so the engine's own boundary stays valid
 */
export function insertShared(sections: readonly ComposableSection[], mine: ComposableSection): ComposableSection[] {
  const shared = sections.filter((section) => section.scope === 'shared')
  const session = sections.filter((section) => section.scope !== 'shared')
  return [...shared, mine, ...session]
}
