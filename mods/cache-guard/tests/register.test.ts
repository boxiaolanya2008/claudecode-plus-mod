import { describe, expect, test, tier } from 'claude-code/testing'

tier('user')

describe('register', () => {
  test('session.start announces readiness and passes through', async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))

    const out = await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

    expect(out.cwd).toBe('/work')
  })
})
