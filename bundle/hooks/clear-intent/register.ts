import type { On } from 'claude-code'

import { intentNote } from './intent'

type IntentOptions = {
  confirmFirst?: boolean
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
 * Attaches the intent protocol beside every submitted prompt, where the
 * model reads it and the user never sees it. Vague input earns the strong
 * note: restate, wait for confirmation, read-only until then.
 *
 * @param on the engine's registrar
 * @param options `confirmFirst` upgrades every prompt to the strong note
 */
export function register(on: On, options: IntentOptions = {}): void {
  const confirmFirst = options.confirmFirst === true
  const verbose = options.verbose === true

  on('session.start', ($, e, next) => {
    report($, '[clear-intent] active, intent protocol armed for prompt.submit', verbose)
    return next(e)
  })

  on('prompt.submit', (_$, e, next) => {
    const { note } = intentNote(e.text, confirmFirst)
    return next({ ...e, context: [...(e.context ?? []), note] })
  })
}
