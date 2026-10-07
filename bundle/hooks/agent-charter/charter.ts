/**
 * Agent charter: one static section pinned into the system prompt. Static on
 * purpose, so it sits on the shared side of the cache boundary in append
 * mode. Replace mode drops the engine's own composition entirely, tools
 * included: only for operators who know what they are giving up.
 */

export const CHARTER_ID = 'plus:agent-charter'

export type CharterMode = 'append' | 'replace'

const CHARTER = [
  '# 代理宪章',
  '',
  '## Skill 与 Plugin 优先',
  '开工前先列出本次任务相关的 skill 和已装 plugin，有现成能力先用，不重复造轮子。',
  '项目级 skill 优先于通用做法；调用了哪个 skill，在总结里注明。',
  '不要臆造不存在的 skill、命令或 API，不确定就先查。',
  '',
  '## 注释规范（按语言）',
  '注释只解释为什么，不解释是什么；禁止装饰性注释（分隔线、星号框、ASCII 艺术）。',
  '- Java: Javadoc',
  '- Python: Docstring',
  '- C#: XML 文档注释',
  '- PHP: PHPDoc',
  '- C / C++: Doxygen',
  '- Go: Go Doc，注释紧贴声明并以名称开头',
  '- Rust: Rustdoc（/// 对外，//! 对内）',
  '- Ruby: RDoc / YARD',
  '- Kotlin: KDoc',
  '',
  '## 提交信息格式',
  '严格遵守：[模块][n/m]{【类型】【版本】中文\\英文描述}(需求号)',
  '示例：[鉴权][2/5]{【修复】【v2.3】登录超时 Login timeout}(REQ-1234)',
  'n/m 是本次系列提交的序号与总数；无需求号时括号内写实际事由，不许空着。',
  '',
  '## 分支与 PR 纪律',
  '每次修改从主分支切新分支，一事一分支，禁止直接在主分支上改。',
  '自测通过、确认无误后才合并；合并后删除分支，不许堆积。',
  'PR 必须讲清三件事：改了什么、为什么改、怎么验证的；缺任何一件都不许合。',
].join('\n')

/**
 * @param raw the `charterMode` option as received, anything unexpected falls back
 * @returns append by default, replace only when explicitly asked
 */
export function resolveCharterMode(raw: unknown): CharterMode {
  if (raw === 'replace') {
    return 'replace'
  }
  return 'append'
}

/**
 * @returns the full charter text
 */
export function buildCharter(): string {
  return CHARTER
}

export type ComposableSection = {
  id: string
  text: string
  scope: 'shared' | 'session'
}

/**
 * @param sections the engine's composed list, every shared one ahead of every session one
 * @param mine the charter section to add
 * @param mode append keeps the engine's composition and adds the charter last
 * among shared; replace drops everything and returns the charter alone
 * @returns the sections the model will read
 */
export function applyCharter(
  sections: readonly ComposableSection[],
  mine: ComposableSection,
  mode: CharterMode,
): ComposableSection[] {
  if (mode === 'replace') {
    return [mine]
  }
  const shared = sections.filter((section) => section.scope === 'shared')
  const session = sections.filter((section) => section.scope !== 'shared')
  return [...shared, mine, ...session]
}
