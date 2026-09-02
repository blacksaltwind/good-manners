import {
  describe,
  expect,
  it,
} from 'vitest'

import path from 'node:path'

import {
  fileURLToPath,
} from 'node:url'

import {
  loadRulesDirectory,
} from '../schema/load-rules.js'

import {
  detectSignals,
} from '../signals/detect-signals.js'

import {
  selectRules,
} from './select-rules.js'

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
)

const rulesDirectory =
  path.resolve(
    __dirname,
    '../../rules',
  )

describe('selectRules', () => {
  it('selects relevant form rules', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const signals =
      detectSignals({
        prompt:
          'Build a form that saves user profile changes',
      })

    const result = selectRules({
      rules,
      signals,
    })

    const ids = new Set(
      result.selected.map(
        (rule) => rule.id,
      ),
    )

    expect(
      ids.has(
        'error.preserve-input',
      ),
    ).toBe(true)

    expect(
      ids.has(
        'core.error-prevention',
      ),
    ).toBe(true)
  })

  it('respects the character budget', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const signals =
      detectSignals({
        prompt:
          'Build a form that saves data asynchronously',
      })

    const result = selectRules({
      rules,
      signals,
      maxCharacters: 1000,
    })

    expect(
      result.characterCount,
    ).toBeLessThanOrEqual(1000)
  })

  it('respects the rule count limit', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const signals =
      detectSignals({
        prompt:
          'Build a login form with loading and error handling.',
      })

    const result = selectRules({
      rules,
      signals,
      maxRules: 20,
    })

    expect(
      result.selected.length,
    ).toBeLessThanOrEqual(20)
  })

  it('prioritizes MUST rules without assuming every MUST rule must be injected', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const signals =
      detectSignals({
        prompt:
          'Build a login form with loading and error handling.',
      })

    const result = selectRules({
      rules,
      signals,
      maxRules: 10,
      maxCharacters: 2000,
    })

    expect(
      result.selected.some(
        (rule) =>
          rule.severity === 'must',
      ),
    ).toBe(true)

    expect(
      result.selected.length,
    ).toBeLessThanOrEqual(10)
  })

  it('reports MUST rules that were not injected', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const signals =
      detectSignals({
        prompt:
          'Build a login form with loading and error handling.',
      })

    const result = selectRules({
      rules,
      signals,
      maxRules: 5,
    })

    expect(
      result.omittedMustRules.length,
    ).toBeGreaterThan(0)
  })
})
