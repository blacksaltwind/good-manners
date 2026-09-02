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
  checkPath,
} from './check-path.js'

const temporaryDirectories: string[] = []

async function temporaryDirectory() {
  const directory =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'good-manners-checker-',
      ),
    )

  temporaryDirectories.push(directory)

  return directory
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

describe('checkPath', () => {
  it('scans CSS files', async () => {
    const directory =
      await temporaryDirectory()

    await fs.writeFile(
      path.join(
        directory,
        'styles.css',
      ),
      'button:focus { outline: none; }',
    )

    const issues =
      await checkPath(directory)

    expect(
      issues.some(
        (issue) =>
          issue.id === 'GMC006',
      ),
    ).toBe(true)
  })

  it('scans SCSS files', async () => {
    const directory =
      await temporaryDirectory()

    await fs.writeFile(
      path.join(
        directory,
        'styles.scss',
      ),
      'button:focus { outline: none; }',
    )

    const issues =
      await checkPath(directory)

    expect(
      issues.some(
        (issue) =>
          issue.id === 'GMC006',
      ),
    ).toBe(true)
  })

  it('ignores generated directories', async () => {
    const directory =
      await temporaryDirectory()

    const dist =
      path.join(
        directory,
        'dist',
      )

    await fs.mkdir(dist)

    await fs.writeFile(
      path.join(
        dist,
        'styles.css',
      ),
      'button:focus { outline: none; }',
    )

    const issues =
      await checkPath(directory)

    expect(issues).toHaveLength(0)
  })

  it('ignores unsupported files', async () => {
    const directory =
      await temporaryDirectory()

    await fs.writeFile(
      path.join(
        directory,
        'notes.txt',
      ),
      'button:focus { outline: none; }',
    )

    const issues =
      await checkPath(directory)

    expect(issues).toHaveLength(0)
  })
})
