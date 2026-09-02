import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  detectSignals,
} from './detect-signals.js'

describe('detectSignals', () => {
  it('detects form and authentication signals', () => {
    const signals = detectSignals({
      prompt:
        'Build a login form with password validation',
    })

    const names = signals.map(
      (signal) => signal.name,
    )

    expect(names).toContain('form')
    expect(names).toContain(
      'authentication',
    )
  })

  it('detects async source code', () => {
    const signals = detectSignals({
      source: [
        `
        async function saveUser() {
          await fetch('/api/user', {
            method: 'POST'
          })
        }
        `,
      ],
    })

    const names = signals.map(
      (signal) => signal.name,
    )

    expect(names).toContain('async')
    expect(names).toContain('mutation')
    expect(names).toContain('network')
  })
})
