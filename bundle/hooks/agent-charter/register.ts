import type { On } from 'claude-code'

import { CHARTER_ID, applyCharter, buildCharter, resolveCharterMode } from './charter'

type CharterOptions = {
  charterMode?: string
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
 * Pins the agent charter into the system prompt. Append mode (default) keeps
 * the engine's composition, tools and safety rails included, and adds the
 * charter last among shared sections. Replace mode drops everything else:
 * use it only when you accept a dumber, unguarded agent.
 *
 * @param on the engine's registrar
 * @param options `charterMode` append or replace; `verbose` surfaces lines
 */
export function register(on: On, options: CharterOptions = {}): void {
  const mode = resolveCharterMode(options.charterMode)
  const verbose = options.verbose === true
  const mine = { id: CHARTER_ID, text: buildCharter(), scope: 'shared' as const }

  on('session.start', ($, e, next) => {
    report($, `[agent-charter] active in ${mode} mode`, verbose)
    return next(e)
  })

  on('prompt.compose', async (_$, e, next) => {
    const out = await next(e)
    return { sections: applyCharter(out.sections, mine, mode) }
  })
}
