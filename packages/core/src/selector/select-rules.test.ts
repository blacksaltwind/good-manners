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

    const ids = result.selected.map(
      (rule) => rule.id,
    )

    expect(ids).toContain(
      'error.preserve-input',
    )

    expect(ids).toContain(
      'core.error-prevention',
    )
  })

  it('respects the token budget unless MUST rules exceed it', async () => {
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
      maxCharacters: 200,
    })

    if (result.budgetExceededByMust) {
      expect(
        result.estimatedTokens,
      ).toBeGreaterThan(200)

      expect(
        result.selected.every(
          (rule) =>
            rule.severity === 'must',
        ),
      ).toBe(true)
    } else {
      expect(
        result.estimatedTokens,
      ).toBeLessThanOrEqual(200)
    }
  })
})

describe('selector priority guarantees', () => {
  it('never drops applicable MUST rules because of token budget', async () => {
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
      maxCharacters: 1,
    })

    const mustApplicable = rules
      .filter(
        (rule) =>
          rule.severity === 'must',
      )
      .filter((rule) => {
        const names = new Set(
          signals.map(
            (signal) => signal.name,
          ),
        )

        return (
          rule.applies_when.none.every(
            (signal) =>
              !names.has(signal),
          ) &&
          rule.applies_when.all.every(
            (signal) =>
              names.has(signal),
          ) &&
          (
            rule.applies_when.any.length ===
              0 ||
            rule.applies_when.any.some(
              (signal) =>
                names.has(signal),
            )
          )
        )
      })

    const selectedIds = new Set(
      result.selected.map(
        (rule) => rule.id,
      ),
    )

    for (const rule of mustApplicable) {
      expect(
        selectedIds.has(rule.id),
      ).toBe(true)
    }

    expect(
      result.budgetExceededByMust,
    ).toBe(true)
  })

  it('reports optional rules omitted by the budget', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const signals =
      detectSignals({
        prompt:
          'Build a form that saves data',
      })

    const result = selectRules({
      rules,
      signals,
      maxCharacters: 400,
    })

    expect(
      result.omittedDueToBudget.length,
    ).toBeGreaterThan(0)
  })
})
