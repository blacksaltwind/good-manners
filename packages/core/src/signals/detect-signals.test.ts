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

  it('detects common UI wording and inflections', () => {
    const signals = detectSignals({
      prompt:
        'Build an editor interaction where the user clicks an image.',
    })

    const names = signals.map(
      (signal) => signal.name,
    )

    expect(names).toContain('ui')
    expect(names).toContain('interactive')
    expect(names).toContain('image')
  })

  it('detects plural images', () => {
    const signals = detectSignals({
      prompt:
        'Build a page containing meaningful images.',
    })

    expect(
      signals.map((signal) => signal.name),
    ).toContain('image')
  })

})
