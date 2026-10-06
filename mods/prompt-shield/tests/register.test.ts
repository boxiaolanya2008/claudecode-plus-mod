import { describe, expect, test, tier } from 'claude-code/testing'

tier('user')

const ZWSP = String.fromCodePoint(0x200b)
const ZWNJ = String.fromCodePoint(0x200c)
const RLO = String.fromCodePoint(0x202e)
const FEFF = String.fromCodePoint(0xfeff)
const TAG_A = String.fromCodePoint(0xe0041)
const TAG_B = String.fromCodePoint(0xe0042)

describe('register', () => {
  test('session.start announces readiness and passes through', async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))

    const out = await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

    expect(out.cwd).toBe('/work')
  })

  test('prompt.submit strips zero-width and bidi controls', async ($, on) => {
    on('prompt.submit', ($, e) => ({ text: e.text }))

    const dirty = 'hello' + ZWSP + ZWNJ + 'world' + RLO + '123' + FEFF
    const { text } = await $.prompt.submit({
      text: dirty,
      wait: false,
      origin: { kind: 'composer' },
    })

    expect(text).toBe('helloworld123')
  })

  test('prompt.submit strips tag characters used as hidden signatures', async ($, on) => {
    on('prompt.submit', ($, e) => ({ text: e.text }))

    const dirty = 'hi' + TAG_A + TAG_B + ' there'
    const { text } = await $.prompt.submit({
      text: dirty,
      wait: false,
      origin: { kind: 'composer' },
    })

    expect(text).toBe('hi there')
  })

  test('clean prompt passes through untouched', async ($, on) => {
    on('prompt.submit', ($, e) => ({ text: e.text }))

    const { text } = await $.prompt.submit({
      text: 'hello 123',
      wait: false,
      origin: { kind: 'composer' },
    })

    expect(text).toBe('hello 123')
  })
})
