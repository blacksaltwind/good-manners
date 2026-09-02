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
  buildContext,
} from './build-context.js'

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
)

const rulesDirectory =
  path.resolve(
    __dirname,
    '../../rules',
  )

describe('buildContext', () => {
  it('keeps the final rendered packet within budget', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const result = buildContext({
      rules,
      prompt:
        'Build a form that saves profile changes.',
      maxTokens: 1200,
    })

    expect(
      result.contextTokens,
    ).toBeLessThanOrEqual(1200)
  })

  it('drops optional rules before MUST rules', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const result = buildContext({
      rules,
      prompt:
        'Build a login form with email and password.',
      maxTokens: 1200,
    })

    expect(
      result.contextTokens,
    ).toBeLessThanOrEqual(1200)

    expect(
      result.selected.some(
        (rule) =>
          rule.severity === 'must',
      ),
    ).toBe(true)
  })

  it('reports overflow when MUST rules alone exceed the budget', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const result = buildContext({
      rules,
      prompt:
        'Build a form that saves profile changes.',
      maxTokens: 10,
    })

    expect(
      result.budgetExceededByMust,
    ).toBe(true)

    expect(
      result.selected.every(
        (rule) =>
          rule.severity === 'must',
      ),
    ).toBe(true)
  })
})
