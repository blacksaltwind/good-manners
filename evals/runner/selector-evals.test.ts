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
  selectorEvalCases,
} from '../cases/selector/cases.js'

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
)

const rulesDirectory = path.resolve(
  __dirname,
  '../../packages/core/rules',
)

describe('Good Manners selector evals', async () => {
  const rules =
    await loadRulesDirectory(
      rulesDirectory,
    )

  for (const evalCase of selectorEvalCases) {
    it(evalCase.id, () => {
      const result = buildContext({
        rules,
        prompt: evalCase.prompt,
        source: evalCase.source,
        maxCharacters:
          evalCase.maxContextCharacters ??
          4800,
      })

      const signals = new Set(
        result.signals.map(
          (signal) => signal.name,
        ),
      )

      const selected = new Set(
        result.selected.map(
          (rule) => rule.id,
        ),
      )

      for (
        const expectedSignal of
        evalCase.expectedSignals ?? []
      ) {
        expect(
          signals.has(expectedSignal),
        ).toBe(true)
      }

      for (
        const rule of
        evalCase.expectedRules.mustInclude
      ) {
        expect(
          selected.has(rule),
          `Expected ${rule} to be selected`,
        ).toBe(true)
      }

      for (
        const rule of
        evalCase.expectedRules
          .mustNotInclude ?? []
      ) {
        expect(
          selected.has(rule),
          `Expected ${rule} not to be selected`,
        ).toBe(false)
      }

      expect(
        result.contextCharacters,
      ).toBeLessThanOrEqual(
        evalCase.maxContextCharacters ??
          4800,
      )
    })
  }
})
