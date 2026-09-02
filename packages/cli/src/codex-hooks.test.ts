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
  installCodexReviewHooks,
  removeCodexReviewHooks,
} from './codex-hooks.js'

const temporaryDirectories: string[] = []

async function fixture() {
  const home =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'good-manners-codex-hooks-',
      ),
    )

  temporaryDirectories.push(home)

  return {
    hooksPath:
      path.join(
        home,
        '.codex',
        'hooks.json',
      ),
    turnStartPath:
      path.join(
        home,
        '.codex',
        'skills',
        'good-manners',
        'scripts',
        'codex-turn-start.mjs',
      ),
    stopPath:
      path.join(
        home,
        '.codex',
        'skills',
        'good-manners',
        'scripts',
        'codex-stop.mjs',
      ),
  }
}

async function readJson(
  file: string,
) {
  return JSON.parse(
    await fs.readFile(
      file,
      'utf8',
    ),
  )
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

describe('Codex review hook settings', () => {
  it('preserves existing settings and hooks', async () => {
    const config =
      await fixture()

    await fs.mkdir(
      path.dirname(config.hooksPath),
      {
        recursive: true,
      },
    )

    await fs.writeFile(
      config.hooksPath,
      JSON.stringify({
        custom: true,
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: 'command',
                  command:
                    'node /existing/hook.mjs',
                },
              ],
            },
          ],
        },
      }),
    )

    await installCodexReviewHooks(config)

    const document =
      await readJson(
        config.hooksPath,
      )

    expect(document.custom).toBe(true)
    expect(
      document.hooks.Stop,
    ).toHaveLength(2)
    expect(
      document.hooks.SessionStart,
    ).toHaveLength(1)
    expect(
      document.hooks.UserPromptSubmit,
    ).toHaveLength(1)
  })

  it('is idempotent', async () => {
    const config =
      await fixture()

    expect(
      await installCodexReviewHooks(
        config,
      ),
    ).toBe(true)

    expect(
      await installCodexReviewHooks(
        config,
      ),
    ).toBe(false)

    const document =
      await readJson(
        config.hooksPath,
      )

    expect(
      document.hooks.SessionStart,
    ).toHaveLength(1)
    expect(
      document.hooks.UserPromptSubmit,
    ).toHaveLength(1)
    expect(
      document.hooks.Stop,
    ).toHaveLength(1)
  })

  it('removes only Good Manners hooks', async () => {
    const config =
      await fixture()

    await fs.mkdir(
      path.dirname(config.hooksPath),
      {
        recursive: true,
      },
    )

    await fs.writeFile(
      config.hooksPath,
      JSON.stringify({
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: 'command',
                  command:
                    'node /existing/hook.mjs',
                },
              ],
            },
          ],
        },
      }),
    )

    await installCodexReviewHooks(config)
    await removeCodexReviewHooks(config)

    const document =
      await readJson(
        config.hooksPath,
      )

    expect(
      document.hooks.Stop,
    ).toHaveLength(1)

    expect(
      document.hooks.Stop[0]
        .hooks[0].command,
    ).toBe(
      'node /existing/hook.mjs',
    )

    expect(
      document.hooks.SessionStart,
    ).toBeUndefined()

    expect(
      document.hooks.UserPromptSubmit,
    ).toBeUndefined()
  })

  it('refuses malformed hook structures', async () => {
    const config =
      await fixture()

    await fs.mkdir(
      path.dirname(config.hooksPath),
      {
        recursive: true,
      },
    )

    await fs.writeFile(
      config.hooksPath,
      JSON.stringify({
        hooks: {
          Stop: 'invalid',
        },
      }),
    )

    await expect(
      installCodexReviewHooks(config),
    ).rejects.toThrow(
      'Codex hooks Stop must be an array.',
    )
  })
})
