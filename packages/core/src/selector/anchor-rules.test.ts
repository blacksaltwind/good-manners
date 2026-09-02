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

describe('signal anchor rules', () => {
  it('prioritizes fundamental form rules', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const signals =
      detectSignals({
        prompt:
          'Build a login form with email and password.',
      })

    const result = selectRules({
      rules,
      signals,
      maxRules: 10,
    })

    const ids = new Set(
      result.selected.map(
        (rule) => rule.id,
      ),
    )

    expect(
      ids.has(
        'form.persistent-label',
      ),
    ).toBe(true)

    expect(
      ids.has(
        'form.submit-state',
      ),
    ).toBe(true)
  })

  it('prioritizes destructive safeguards', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const signals =
      detectSignals({
        prompt:
          'Permanently delete the account.',
      })

    const result = selectRules({
      rules,
      signals,
      maxRules: 10,
    })

    const ids = new Set(
      result.selected.map(
        (rule) => rule.id,
      ),
    )

    expect(
      ids.has(
        'destructive.confirm-irreversible',
      ),
    ).toBe(true)
  })
})
