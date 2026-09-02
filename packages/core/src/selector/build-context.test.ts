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
  it('keeps the final packet within the character budget', async () => {
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

  it('keeps the selected rule count bounded', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const result = buildContext({
      rules,
      prompt:
        'Build a login form with loading and errors.',
      maxRules: 30,
    })

    expect(
      result.selected.length,
    ).toBeLessThanOrEqual(30)
  })

  it('does not activate for backend-only work', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const result = buildContext({
      rules,
      prompt:
        'Refactor a Node.js repository query.',
    })

    expect(result.active).toBe(false)

    expect(
      result.selected.length,
    ).toBe(0)

    expect(
      result.contextCharacters,
    ).toBe(0)
  })

  it('keeps token estimates informational', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const result = buildContext({
      rules,
      prompt:
        'Build a profile form.',
    })

    expect(
      result.contextEstimatedTokens,
    ).toBeGreaterThan(0)

    expect(
      result.contextCharacters,
    ).toBe(
      result.context.length,
    )
  })
})
