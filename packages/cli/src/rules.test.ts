import {
  describe,
  expect,
  it,
} from 'vitest'

import path from 'node:path'

import {
  formatRuleSummary,
  loadBundledRules,
  searchRules,
} from './rules.js'

const referencesDirectory =
  path.resolve(
    'packages/skill/dist/good-manners/references',
  )

describe('Good Manners rules search', () => {
  it('loads the full bundled rule catalog', async () => {
    const rules =
      await loadBundledRules(
        referencesDirectory,
      )

    expect(rules).toHaveLength(100)
  })

  it('finds an exact rule id', async () => {
    const rules =
      await loadBundledRules(
        referencesDirectory,
      )

    const results =
      searchRules(
        rules,
        'error.preserve-input',
      )

    expect(results[0]?.id).toBe(
      'error.preserve-input',
    )
  })

  it('is case-insensitive for category searches', async () => {
    const rules =
      await loadBundledRules(
        referencesDirectory,
      )

    const results =
      searchRules(
        rules,
        'FORM',
      )

    expect(
      results.length,
    ).toBeGreaterThan(0)

    expect(
      results.every(
        (rule) =>
          rule.category === 'form',
      ),
    ).toBe(true)
  })

  it('matches multi-word queries across ids and instructions', async () => {
    const rules =
      await loadBundledRules(
        referencesDirectory,
      )

    const results =
      searchRules(
        rules,
        'preserve input',
      )

    expect(
      results.some(
        (rule) =>
          rule.id ===
          'error.preserve-input',
      ),
    ).toBe(true)
  })

  it('limits vague search results', async () => {
    const rules =
      await loadBundledRules(
        referencesDirectory,
      )

    const results =
      searchRules(
        rules,
        'error',
        5,
      )

    expect(results.length).toBeLessThanOrEqual(5)
  })

  it('produces a category summary', async () => {
    const rules =
      await loadBundledRules(
        referencesDirectory,
      )

    const output =
      formatRuleSummary(rules)

    expect(output).toContain(
      'Good Manners rules: 100',
    )

    expect(output).toContain(
      '- form: 12',
    )
    expect(output).toContain(
      '- accessibility: 15',
    )
  })
})
