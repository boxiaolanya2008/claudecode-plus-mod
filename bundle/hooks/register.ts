import type { On } from 'claude-code'

import { register as agentCharter } from './agent-charter/register'
import { register as cacheGuard } from './cache-guard/register'
import { register as clearIntent } from './clear-intent/register'
import { register as humanTone } from './human-tone/register'
import { register as promptShield } from './prompt-shield/register'

type PlusOptions = {
  verbose?: boolean
  forbidAutoCompact?: boolean
  dropAttachmentTypes?: string[]
  mode?: string
  extra?: string
  confirmFirst?: boolean
  charterMode?: string
}

/**
 * Registers every Mod in the bundle through one entry: each Mod reads only
 * the option keys it owns, so one options object serves all of them.
 *
 * @param on the engine's registrar
 * @param options shared options; `verbose` for all Mods, `forbidAutoCompact`
 * and `dropAttachmentTypes` for cache-guard, `mode` and `extra` for
 * human-tone, `confirmFirst` for clear-intent, `charterMode` for
 * agent-charter
 */
export function register(on: On, options: PlusOptions = {}): void {
  promptShield(on, options)
  cacheGuard(on, options)
  humanTone(on, options)
  clearIntent(on, options)
  agentCharter(on, options)
}