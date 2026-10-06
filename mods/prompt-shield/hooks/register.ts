import type { On } from 'claude-code'

import { preview, removedCount, stripInvisible } from './sanitize'

type ShieldOptions = {
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
 * Registers prompt hygiene hooks: prompt.submit/context/attachment and
 * attribution.text are scanned on the way out, invisible characters that can
 * carry a hidden signature are removed, the cleaned value continues down.
 * Every hook fires on engine events alone, so the mod works from session
 * start with no model call needed; session.start only announces readiness.
 *
 * @param on the engine's registrar
 * @param options the plugin's options; `verbose` surfaces each strip in the transcript
 */
export function register(on: On, options: ShieldOptions = {}): void {
  const verbose = options.verbose === true

  on('session.start', ($, e, next) => {
    report($, '[prompt-shield] active, watching prompt.submit, prompt.context, prompt.attachment, attribution.text', verbose)
    return next(e)
  })

  on('prompt.submit', ($, e, next) => {
    const text = stripInvisible(e.text)
    const dropped = removedCount(e.text, text)
    const context = e.context?.map((entry) => stripInvisible(entry))
    const contextDropped = (e.context ?? []).reduce(
      (sum, entry, i) => sum + removedCount(entry, context?.[i] ?? entry),
      0,
    )
    if (dropped > 0 || contextDropped > 0) {
      report($, `[prompt-shield] prompt.submit stripped ${dropped + contextDropped} invisible chars: ${preview(e.text)}`, verbose)
    }
    return next({ ...e, text, context })
  })

  on('prompt.context', async ($, e, next) => {
    const blocks = e.blocks.map((block) => {
      const text = stripInvisible(block.text)
      const dropped = removedCount(block.text, text)
      if (dropped > 0) {
        report($, `[prompt-shield] prompt.context block "${block.name}" stripped ${dropped} invisible chars`, verbose)
      }
      return { ...block, text }
    })
    return next({ ...e, blocks })
  })

  on('prompt.attachment', async ($, e, next) => {
    const out = await next(e)
    if (out.text === null) {
      return out
    }
    const text = stripInvisible(out.text)
    const dropped = removedCount(out.text, text)
    if (dropped > 0) {
      report($, `[prompt-shield] prompt.attachment "${e.type}" stripped ${dropped} invisible chars`, verbose)
    }
    return { text }
  })

  on('attribution.text', async ($, e, next) => {
    const out = await next(e)
    const text = stripInvisible(out.text)
    const dropped = removedCount(out.text, text)
    if (dropped > 0) {
      report($, `[prompt-shield] attribution.text "${e.kind}" stripped ${dropped} invisible chars`, verbose)
    }
    return { text }
  })
}
