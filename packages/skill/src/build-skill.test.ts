import {
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest'

import fs from 'node:fs/promises'
import path from 'node:path'

const skillRoot = path.resolve(
  'packages/skill/dist/good-manners',
)

beforeAll(async () => {
  await import('./build-skill.js')
})

describe('Good Manners skill build', () => {
  it('creates SKILL.md', async () => {
    const content =
      await fs.readFile(
        path.join(
          skillRoot,
          'SKILL.md',
        ),
        'utf8',
      )

    expect(content).toContain(
      'name: good-manners',
    )

    expect(content).toContain(
      'Good UX is just good manners.',
    )
  })

  it('creates all reference categories', async () => {
    const expected = [
      'accessibility.md',
      'cognitive.md',
      'core.md',
      'destructive.md',
      'error.md',
      'feedback.md',
      'flow.md',
      'form.md',
      'navigation.md',
      'responsive.md',
    ]

    const files =
      await fs.readdir(
        path.join(
          skillRoot,
          'references',
        ),
      )

    for (const file of expected) {
      expect(files).toContain(file)
    }
  })

  it('does not dump every rule into SKILL.md', async () => {
    const content =
      await fs.readFile(
        path.join(
          skillRoot,
          'SKILL.md',
        ),
        'utf8',
      )

    expect(
      content.length,
    ).toBeLessThan(6000)
  })

  it('creates the machine-readable rule catalog', async () => {
    const parsed = JSON.parse(
      await fs.readFile(
        path.join(
          skillRoot,
          'rules.json',
        ),
        'utf8',
      ),
    )

    expect(parsed.schema_version).toBe(1)
    expect(parsed.rules).toHaveLength(100)
  })

})
