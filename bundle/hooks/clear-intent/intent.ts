/**
 * Intent protocol: a short confirmation-first note attached beside every
 * prompt. The model cannot be forced into an inner loop from outside, so the
 * lever is the instruction it reads: restate the goal, mark what is assumed,
 * and stop before load-bearing actions on vague input.
 */

export type IntentLevel = 'strong' | 'standard'

const STANDARD_NOTE = [
  '意图协议：动工前先用一句话说清用户到底要什么。',
  '严格区分【已确认】和【脑补】；靠脑补才能成立的关键步骤，先问一句再动手。',
  '禁止过度解读：没说的需求不许自行脑补实现。',
].join('\n')

const STRONG_NOTE = [
  '意图协议（本次输入模糊）：必须先用一句话复述你的理解并等用户确认。',
  '确认之前只做只读操作，不写文件、不跑会产生副作用的命令。',
  '禁止按自己的猜测直接开工，猜错比追问贵。',
].join('\n')

const VAGUE_PATTERNS = [/随便/, /看着办/, /都可以/, /都行/, /帮我(一下)?$/, /^(hi|hello|在吗|你好)[!！.。]*$/i]

/**
 * @param text the prompt as typed
 * @param confirmFirst when true, every prompt gets the strong note
 * @returns the note level and text to attach beside the prompt
 */
export function intentNote(text: string, confirmFirst = false): { level: IntentLevel; note: string } {
  const trimmed = text.trim()
  const short = [...trimmed].length < 12
  const vague = VAGUE_PATTERNS.some((pattern) => pattern.test(trimmed))
  if (confirmFirst || short || vague) {
    return { level: 'strong', note: STRONG_NOTE }
  }
  return { level: 'standard', note: STANDARD_NOTE }
}
