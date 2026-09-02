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
  buildContext,
  loadRulesDirectory,
} from '../../packages/core/src/index.js'

import {
  stressCases,
} from '../cases/stress/cases.js'

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
)

const rulesDirectory = path.resolve(
  __dirname,
  '../../packages/core/rules',
)

describe('Good Manners selector stress tests', async () => {
  const rules =
    await loadRulesDirectory(
      rulesDirectory,
    )

  for (const testCase of stressCases) {
    it(testCase.id, () => {
      const result = buildContext({
        rules,
        prompt: testCase.prompt,
        source: testCase.source,
        maxCharacters:
          testCase.maxCharacters ||
          4800,
      })

      const selected = new Set(
        result.selected.map(
          (rule) => rule.id,
        ),
      )

      for (const rule of testCase.mustInclude) {
        expect(
          selected.has(rule),
          `Expected ${rule} to be selected`,
        ).toBe(true)
      }

      for (
        const rule of
        testCase.mustExclude ?? []
      ) {
        expect(
          selected.has(rule),
          `Expected ${rule} NOT to be selected`,
        ).toBe(false)
      }

      if (testCase.maxSelectedRules === 0) {
        expect(
          result.selected.length,
        ).toBe(0)

        return
      }

      expect(
        result.selected.length,
        'Too many rules selected',
      ).toBeLessThanOrEqual(
        testCase.maxSelectedRules,
      )

      expect(
        result.contextCharacters,
      ).toBeLessThanOrEqual(
        testCase.maxCharacters,
      )
    })
  }
})
