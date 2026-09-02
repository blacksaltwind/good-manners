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
  installClaudeStopHook,
  removeClaudeStopHook,
} from './claude-settings.js'

const temporaryDirectories: string[] = []

async function fixture() {
  const home =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'good-manners-claude-settings-',
      ),
    )

  temporaryDirectories.push(home)

  return {
    settingsPath:
      path.join(
        home,
        '.claude',
        'settings.json',
      ),
    hookPath:
      path.join(
        home,
        '.claude',
        'skills',
        'good-manners',
        'scripts',
        'claude-code-stop.mjs',
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

describe('Claude settings integration', () => {
  it('adds a Stop hook without replacing existing settings', async () => {
    const {
      settingsPath,
      hookPath,
    } = await fixture()

    await fs.mkdir(
      path.dirname(settingsPath),
      {
        recursive: true,
      },
    )

    await fs.writeFile(
      settingsPath,
      JSON.stringify({
        theme: 'dark',
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: 'command',
                  command:
                    '/existing/hook.sh',
                },
              ],
            },
          ],
        },
      }),
    )

    await installClaudeStopHook({
      settingsPath,
      hookPath,
    })

    const settings =
      await readJson(
        settingsPath,
      )

    expect(settings.theme).toBe('dark')
    expect(
      settings.hooks.Stop,
    ).toHaveLength(2)
  })

  it('is idempotent', async () => {
    const {
      settingsPath,
      hookPath,
    } = await fixture()

    await installClaudeStopHook({
      settingsPath,
      hookPath,
    })

    await installClaudeStopHook({
      settingsPath,
      hookPath,
    })

    const settings =
      await readJson(
        settingsPath,
      )

    expect(
      settings.hooks.Stop,
    ).toHaveLength(1)
  })

  it('removes only the Good Manners hook', async () => {
    const {
      settingsPath,
      hookPath,
    } = await fixture()

    await fs.mkdir(
      path.dirname(settingsPath),
      {
        recursive: true,
      },
    )

    await fs.writeFile(
      settingsPath,
      JSON.stringify({
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: 'command',
                  command:
                    '/existing/hook.sh',
                },
              ],
            },
          ],
        },
      }),
    )

    await installClaudeStopHook({
      settingsPath,
      hookPath,
    })

    await removeClaudeStopHook({
      settingsPath,
      hookPath,
    })

    const settings =
      await readJson(
        settingsPath,
      )

    expect(
      settings.hooks.Stop,
    ).toHaveLength(1)

    expect(
      settings.hooks.Stop[0]
        .hooks[0].command,
    ).toBe('/existing/hook.sh')
  })

  it('refuses malformed hook structures', async () => {
    const {
      settingsPath,
      hookPath,
    } = await fixture()

    await fs.mkdir(
      path.dirname(settingsPath),
      {
        recursive: true,
      },
    )

    await fs.writeFile(
      settingsPath,
      JSON.stringify({
        hooks: {
          Stop: 'invalid',
        },
      }),
    )

    await expect(
      installClaudeStopHook({
        settingsPath,
        hookPath,
      }),
    ).rejects.toThrow(
      'hooks.Stop must be an array',
    )
  })
})
