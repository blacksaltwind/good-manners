import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import { loadRulesDirectory } from './load-rules.js'

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
)

const rulesDirectory = path.resolve(
  __dirname,
  '../../rules',
)

describe('loadRulesDirectory', () => {
  it('loads all rules recursively', async () => {
    const rules =
      await loadRulesDirectory(rulesDirectory)

    expect(rules.length).toBe(11)

    expect(
      rules.some(
        (rule) =>
          rule.id === 'core.primary-task',
      ),
    ).toBe(true)

    expect(
      rules.some(
        (rule) =>
          rule.id === 'error.preserve-input',
      ),
    ).toBe(true)
  })

  it('returns rules sorted by ID', async () => {
    const rules =
      await loadRulesDirectory(rulesDirectory)

    const ids = rules.map((rule) => rule.id)

    expect(ids).toEqual(
      [...ids].sort((a, b) =>
        a.localeCompare(b),
      ),
    )
  })

  it('rejects duplicate rule IDs', async () => {
    const temporaryDirectory =
      await fs.mkdtemp(
        path.join(
          process.cwd(),
          '.good-manners-test-',
        ),
      )

    const rule = `
schema_version: 1
id: duplicate.rule
version: 1
title: Duplicate rule
category: core
severity: must
instruction: This is a duplicate test rule.
tags: []
applies_when:
  any: []
  all: []
  none: []
checks:
  deterministic: []
  agent: true
  autofix: none
exceptions: []
related: []
`

    try {
      await fs.writeFile(
        path.join(
          temporaryDirectory,
          'one.yaml',
        ),
        rule,
      )

      await fs.writeFile(
        path.join(
          temporaryDirectory,
          'two.yaml',
        ),
        rule,
      )

      await expect(
        loadRulesDirectory(
          temporaryDirectory,
        ),
      ).rejects.toThrow(
        'Duplicate Good Manners rule ID',
      )
    } finally {
      await fs.rm(temporaryDirectory, {
        recursive: true,
        force: true,
      })
    }
  })
})
