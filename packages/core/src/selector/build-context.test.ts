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
  it('keeps the final rendered packet within the character budget', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const result = buildContext({
      rules,
      prompt:
        'Build a form that saves profile changes.',
      maxCharacters: 4800,
    })

    expect(
      result.contextCharacters,
    ).toBeLessThanOrEqual(4800)
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
      maxCharacters: 4800,
    })

    expect(
      result.contextCharacters,
    ).toBeLessThanOrEqual(4800)

    expect(
      result.selected.some(
        (rule) =>
          rule.severity === 'must',
      ),
    ).toBe(true)
  })

  it('reports overflow when MUST rules alone exceed the character budget', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const result = buildContext({
      rules,
      prompt:
        'Build a form that saves profile changes.',
      maxCharacters: 40,
    })

    expect(
      result.budgetExceededByMust,
    ).toBe(true)

    expect(
      result.contextCharacters,
    ).toBeGreaterThan(40)

    expect(
      result.selected.every(
        (rule) =>
          rule.severity === 'must',
      ),
    ).toBe(true)
  })

  it('keeps estimated tokens informational', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const result = buildContext({
      rules,
      prompt:
        'Build a profile form.',
      maxCharacters: 4800,
    })

    expect(
      result.contextEstimatedTokens,
    ).toBeGreaterThan(0)

    expect(
      result.contextCharacters,
    ).toBe(result.context.length)
  })
})
