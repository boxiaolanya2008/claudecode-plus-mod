import { describe, expect, test, tier } from 'claude-code/testing'

import { auditCompact, auditCustody, cacheLine, evidenceKey, fingerprintMessages, isColdMiss, normalizeVolatile, previewMessage, pruneKeys, stabilize, stableStringify } from '../hooks/fingerprint'

tier('user')

describe('fingerprint', () => {
  test('key order does not change the hash', () => {
    const left = fingerprintMessages([{ role: 'user', text: 'hi', n: 1 }])
    const right = fingerprintMessages([{ n: 1, text: 'hi', role: 'user' }])

    expect(left).toEqual(right)
  })

  test('engine handle is not content', () => {
    const left = fingerprintMessages([{ role: 'user', text: 'hi', handle: 'aaa' }])
    const right = fingerprintMessages([{ role: 'user', text: 'hi', handle: 'bbb' }])

    expect(left).toEqual(right)
  })

  test('one changed character changes the hash', () => {
    const left = fingerprintMessages([{ role: 'user', text: 'hi' }])
    const right = fingerprintMessages([{ role: 'user', text: 'hi!' }])

    expect(left).not.toEqual(right)
  })

  test('stableStringify never throws on odd values', () => {
    expect(() => stableStringify(undefined)).not.toThrow()
    expect(() => stableStringify([1, undefined, { a: 1 }])).not.toThrow()
  })

  test('audit counts kept, dropped and added', () => {
    const audit = auditCompact(['a', 'b', 'c'], ['b', 'c', 'd', 'd'])

    expect(audit).toEqual({ kept: 2, dropped: 1, added: 2 })
  })

  test('cache line reports hit rate', () => {
    const line = cacheLine({
      input_tokens: 1000,
      cache_creation_input_tokens: 1000,
      cache_read_input_tokens: 18000,
      output_tokens: 320,
    })

    expect(line).toBe('cache read 18000/20000 input (90%), created 1000, output 320')
  })

  test('empty request from cache is a cold miss', () => {
    expect(
      isColdMiss({
        input_tokens: 500,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: 10,
      }),
    ).toBe(true)
    expect(
      isColdMiss({
        input_tokens: 500,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 400,
        output_tokens: 10,
      }),
    ).toBe(false)
  })

  test('evidence keys prune oldest first, foreign keys untouched', () => {
    const deleted = pruneKeys(
      ['other', 'compact-evidence:3', 'compact-evidence:1', 'compact-evidence:2', 'compact-evidence:xx'],
      'compact-evidence:',
      2,
    )

    expect(deleted).toEqual(['compact-evidence:1'])
  })

  test('custody passes on pure append', () => {
    expect(auditCustody(['a', 'b'], ['a', 'b', 'c', 'd'])).toEqual({ appended: 2, dropped: [], moved: false })
  })

  test('custody names vanished messages', () => {
    expect(auditCustody(['a', 'b', 'c'], ['a', 'c', 'd'])).toEqual({ appended: 1, dropped: [1], moved: true })
  })

  test('custody flags reorder', () => {
    expect(auditCustody(['a', 'b', 'c'], ['b', 'a', 'c', 'd']).moved).toBe(true)
  })

  test('preview shortens without dumping', () => {
    expect(previewMessage({ role: 'user', text: 'hi' })).toBe('[user] hi')
    expect(previewMessage({ role: 'assistant', text: 'x'.repeat(200) }).length).toBeLessThan(100)
  })

  test('volatile-only drift pins to settled text', () => {
    const settled = 'built at 2026-10-06 14:03:22, date 2026-10-06'
    const recomposed = 'built at 2026-10-06 15:47:09, date 2026-10-06'
    const stable = stabilize(settled, recomposed)

    expect(stable).toEqual({ text: settled, pinned: true, drifted: false })
  })

  test('real content change passes through with drift flagged', () => {
    const stable = stabilize('memory v1', 'memory v2')

    expect(stable).toEqual({ text: 'memory v2', pinned: false, drifted: true })
  })

  test('first sight memorizes without flagging', () => {
    expect(stabilize(undefined, 'hello')).toEqual({ text: 'hello', pinned: false, drifted: false })
  })

  test('timestamps normalize to date, code without timestamps untouched', () => {
    expect(normalizeVolatile('at 2026-10-06T14:03:22Z done')).toBe('at 2026-10-06 done')
    expect(normalizeVolatile('meet at 14:30 sharp')).toBe('meet at 00:00 sharp')
    expect(normalizeVolatile('listen on localhost:3000')).toBe('listen on localhost:3000')
    expect(normalizeVolatile('version 2.1.280')).toBe('version 2.1.280')
    expect(normalizeVolatile('a\r\nb')).toBe('a\nb')
  })
})
