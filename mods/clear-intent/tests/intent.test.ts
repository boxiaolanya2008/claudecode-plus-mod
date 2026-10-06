import { describe, expect, test, tier } from 'claude-code/testing'

import { intentNote } from '../hooks/intent'

tier('user')

describe('intent', () => {
  test('session.start announces readiness and passes through', async ($, on) => {
    on('session.start', ($, e) => ({ cwd: e.cwd }))

    const out = await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

    expect(out.cwd).toBe('/work')
  })

  test('short input earns the strong note', () => {
    expect(intentNote('帮我').level).toBe('strong')
    expect(intentNote('随便').level).toBe('strong')
  })

  test('vague patterns earn the strong note', () => {
    expect(intentNote('这个需求看着办吧').level).toBe('strong')
    expect(intentNote('在吗').level).toBe('strong')
    expect(intentNote('请把这个需求看着办一下要快一二三四').level).toBe('strong')
  })

  test('clear input gets the standard note', () => {
    const { level, note } = intentNote('把登录接口的超时从3秒改成10秒，只改服务端')

    expect(level).toBe('standard')
    expect(note).toContain('脑补')
  })

  test('confirmFirst upgrades everything', () => {
    expect(intentNote('把登录接口的超时从3秒改成10秒', true).level).toBe('strong')
  })

  test('submit hook attaches note and keeps the prompt intact', async ($, on) => {
    on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))

    const { text, context } = await $.prompt.submit({
      text: '随便写个登录页',
      wait: false,
      origin: { kind: 'composer' },
    })

    expect(text).toBe('随便写个登录页')
    expect(context?.length).toBe(1)
    expect(context?.[0]).toContain('只读')
  })
})
