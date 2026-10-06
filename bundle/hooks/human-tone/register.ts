import type { On } from 'claude-code'

import { SECTION_ID, insertShared, resolveMode, styleGuide } from './guide'

type ToneOptions = {
  mode?: string
  extra?: string
  verbose?: boolean
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
 * Appends one static style section to the system prompt, last among the
 * shared sections so the engine's cache boundary stays valid. Static text
 * costs no prompt cache; `extra` is the only varying part, keep it stable.
 *
 * @param on the engine's registrar
 * @param options `mode` picks default, terse or warm; `extra` appends lines
 */
export function register(on: On, options: ToneOptions = {}): void {
  const text = styleGuide(resolveMode(options.mode), options.extra)
  const verbose = options.verbose === true

  on('session.start', ($, e, next) => {
    report($, '[human-tone] active, style section armed for prompt.compose', verbose)
    return next(e)
  })

  on('prompt.compose', async (_$, e, next) => {
    const out = await next(e)
    const mine = { id: SECTION_ID, text, scope: 'shared' as const }
    return { sections: insertShared(out.sections, mine) }
  })
}
