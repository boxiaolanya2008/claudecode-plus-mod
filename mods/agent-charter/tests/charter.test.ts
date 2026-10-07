import { describe, expect, test, tier } from 'claude-code/testing'

import { CHARTER_ID, applyCharter, buildCharter, resolveCharterMode } from '../hooks/charter'

tier('user')

describe('charter', () => {
  test('session.start announces readiness and passes through', async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))

    const out = await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

    expect(out.cwd).toBe('/work')
  })

  test('replace is opt-in, everything else appends', () => {
    expect(resolveCharterMode('replace')).toBe('replace')
    expect(resolveCharterMode('append')).toBe('append')
    expect(resolveCharterMode('nuke')).toBe('append')
    expect(resolveCharterMode(undefined)).toBe('append')
  })

  test('charter carries every required theme', () => {
    const text = buildCharter()

    expect(text).toContain('skill')
    expect(text).toContain('Javadoc')
    expect(text).toContain('Docstring')
    expect(text).toContain('Doxygen')
    expect(text).toContain('Rustdoc')
    expect(text).toContain('KDoc')
    expect(text).toContain('[模块][n/m]')
    expect(text).toContain('一事一分支')
  })

  test('append keeps engine sections, replace drops them', () => {
    const sections = [
      { id: 'intro', text: 'a', scope: 'shared' as const },
      { id: 'tools', text: 'b', scope: 'session' as const },
    ]
    const mine = { id: CHARTER_ID, text: 'charter', scope: 'shared' as const }

    expect(applyCharter(sections, mine, 'append').map((section) => section.id)).toEqual([
      'intro',
      CHARTER_ID,
      'tools',
    ])
    expect(applyCharter(sections, mine, 'replace')).toEqual([mine])
  })
})
