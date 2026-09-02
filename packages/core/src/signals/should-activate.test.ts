import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  detectSignals,
} from './detect-signals.js'

import {
  shouldActivate,
} from './should-activate.js'

describe('shouldActivate', () => {
  it('activates for UI work', () => {
    const signals = detectSignals({
      prompt:
        'Build a login form.',
    })

    expect(
      shouldActivate(signals),
    ).toBe(true)
  })

  it('does not activate for backend-only work', () => {
    const signals = detectSignals({
      prompt:
        'Refactor a Node.js database repository function.',
    })

    expect(
      shouldActivate(signals),
    ).toBe(false)
  })
})

it('does not treat a database query as UI search', () => {
  const signals = detectSignals({
    prompt:
      'Refactor a Node.js repository query.',
  })

  expect(
    shouldActivate(signals),
  ).toBe(false)
})
