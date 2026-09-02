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

  it('respects the token budget', async () => {
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
      maxTokens: 50,
    })

    expect(
      result.estimatedTokens,
    ).toBeLessThanOrEqual(50)
  })
})
