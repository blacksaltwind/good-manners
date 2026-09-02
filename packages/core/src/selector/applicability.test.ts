import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  isRuleApplicable,
} from './applicability.js'

import type {
  Rule,
} from '../schema/rule.js'

const rule: Rule = {
  schema_version: 1,
  id: 'test.rule',
  version: 1,
  title: 'Test rule',
  category: 'core',
  severity: 'must',
  instruction: 'Test instruction.',
  tags: [],
  applies_when: {
    any: ['form', 'mutation'],
    all: [],
    none: ['irreversible'],
  },
  checks: {
    deterministic: [],
    agent: true,
    autofix: 'none',
  },
  exceptions: [],
  related: [],
}

describe('isRuleApplicable', () => {
  it('matches any signal', () => {
    expect(
      isRuleApplicable(
        rule,
        new Set(['form']),
      ),
    ).toBe(true)
  })

  it('rejects excluded signals', () => {
    expect(
      isRuleApplicable(
        rule,
        new Set([
          'form',
          'irreversible',
        ]),
      ),
    ).toBe(false)
  })
})
