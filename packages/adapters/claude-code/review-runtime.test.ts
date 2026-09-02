import {
  afterEach,
  describe,
  expect,
  it,
} from 'vitest'

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  buildReviewPacket,
} from './review-runtime.js'

const temporaryDirectories: string[] = []

async function fixture() {
  const cwd = await fs.mkdtemp(
    path.join(
      os.tmpdir(),
      'good-manners-review-runtime-',
    ),
  )

  temporaryDirectories.push(cwd)
  return cwd
}

afterEach(async () => {
  for (
    const directory of
    temporaryDirectories.splice(0)
  ) {
    await fs.rm(
      directory,
      {
        recursive: true,
        force: true,
      },
    )
  }
})

describe('final review runtime', () => {
  it('combines selected rules and deterministic findings', async () => {
    const cwd = await fixture()

    await fs.writeFile(
      path.join(cwd, 'Login.tsx'),
      '<form><input placeholder="Email" /><button>Save</button></form>',
    )

    const result = await buildReviewPacket({
      cwd,
      changedFiles: ['Login.tsx'],
      prompt: 'Build a login form with useful error recovery.',
      rulesPath: path.resolve(
        'packages/skill/dist/good-manners/rules.json',
      ),
    })

    expect(result.shouldReview).toBe(true)
    expect(result.context).toContain(
      'GOOD MANNERS FINAL REVIEW',
    )
    expect(result.context).toContain('GMC')
    expect(result.context).toContain('MUST')
    expect(result.characterCount).toBeLessThanOrEqual(3600)
  })
})
