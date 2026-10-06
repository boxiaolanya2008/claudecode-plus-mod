import { describe, expect, test, tier } from 'claude-code/testing'

import { SECTION_ID, insertShared, resolveMode, styleGuide } from '../hooks/guide'

tier('user')

describe('guide', () => {
  test('session.start announces readiness and passes through', async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))

    const out = await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

    expect(out.cwd).toBe('/work')
  })

  test('unknown mode falls back to default', () => {
    expect(resolveMode('nope')).toBe('default')
    expect(resolveMode(undefined)).toBe('default')
    expect(resolveMode('terse')).toBe('terse')
  })

  test('guides differ by mode and extra appends', () => {
    const base = styleGuide('default')
    expect(styleGuide('terse')).not.toBe(base)
    expect(styleGuide('warm')).not.toBe(base)
    expect(styleGuide('default', '  多用短句  ')).toBe(`${base}\n多用短句`)
    expect(styleGuide('default', '   ')).toBe(base)
  })

  test('style section lands last among shared', () => {
    const sections = [
      { id: 'intro', text: 'a', scope: 'shared' as const },
      { id: 'memory', text: 'b', scope: 'session' as const },
      { id: 'tools', text: 'c', scope: 'shared' as const },
    ]
    const mine = { id: SECTION_ID, text: 'style', scope: 'shared' as const }
    const out = insertShared(sections, mine)

    expect(out.map((section) => section.id)).toEqual(['intro', 'tools', SECTION_ID, 'memory'])
  })

  test('compose hook appends without touching engine sections', async ($, on) => {
    const before = [
      { id: 'intro', text: 'a', scope: 'shared' as const },
      { id: 'memory', text: 'b', scope: 'session' as const },
    ]
    on('prompt.compose', ($, e) => ({ sections: before }))

    const out = await $.prompt.compose({
      model: 'opus',
      promptModel: 'opus',
      surfaces: [],
      tools: [],
      outputStyle: null,
      traits: [],
    })

    expect(out.sections.map((section) => section.id)).toEqual(['intro', SECTION_ID, 'memory'])
    expect(out.sections[1]?.text).toContain('先给结论')
  })
})
