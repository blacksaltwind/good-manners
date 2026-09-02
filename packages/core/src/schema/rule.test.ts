import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRuleFile } from './load-rule.js'
import { RuleSchema } from './rule.js'

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
)

describe('RuleSchema', () => {
  it('accepts a valid rule', () => {
    const result = RuleSchema.parse({
      schema_version: 1,
      id: 'form.persistent-label',
      version: 1,
      title: 'Use persistent labels',
      category: 'form',
      severity: 'must',
      instruction:
        'Give form fields persistent visible labels.',
      tags: ['form'],
      applies_when: {
        any: ['form'],
        all: [],
        none: [],
      },
      checks: {
        deterministic: [],
        agent: true,
        autofix: 'suggest',
      },
      exceptions: [],
      related: [],
    })

    expect(result.id).toBe(
      'form.persistent-label',
    )
  })

  it('rejects invalid severity', () => {
    expect(() =>
      RuleSchema.parse({
        schema_version: 1,
        id: 'test.rule',
        version: 1,
        title: 'Test',
        category: 'core',
        severity: 'critical',
        instruction: 'Test instruction',
        tags: [],
        applies_when: {
          any: [],
          all: [],
          none: [],
        },
        checks: {
          deterministic: [],
          agent: true,
          autofix: 'none',
        },
        exceptions: [],
        related: [],
      }),
    ).toThrow()
  })

  it('loads and validates a YAML rule', async () => {
    const rulePath = path.resolve(
      __dirname,
      '../../rules/error/preserve-input.yaml',
    )

    const rule = await loadRuleFile(rulePath)

    expect(rule.id).toBe(
      'error.preserve-input',
    )

    expect(rule.severity).toBe('must')
  })
})
