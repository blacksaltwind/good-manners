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
  installClaudeReviewHooks,
  removeClaudeReviewHooks,
} from './claude-settings.js'

const temporaryDirectories: string[] = []

async function fixture() {
  const home =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'good-manners-claude-review-',
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
    stopHookPath:
      path.join(
        home,
        '.claude',
        'skills',
        'good-manners',
        'scripts',
        'claude-code-stop.mjs',
      ),
    turnStartHookPath:
      path.join(
        home,
        '.claude',
        'skills',
        'good-manners',
        'scripts',
        'claude-code-turn-start.mjs',
      ),
  }
}

async function readSettings(
  settingsPath: string,
) {
  return JSON.parse(
    await fs.readFile(
      settingsPath,
      'utf8',
    ),
  ) as {
    theme?: string
    hooks?: Record<
      string,
      Array<{
        hooks?: Array<{
          type?: string
          command?: string
          args?: string[]
        }>
      }>
    >
  }
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

describe('Claude review hook integration', () => {
  it('installs all three lifecycle hooks without replacing existing hooks', async () => {
    const paths =
      await fixture()

    await fs.mkdir(
      path.dirname(
        paths.settingsPath,
      ),
      {
        recursive: true,
      },
    )

    await fs.writeFile(
      paths.settingsPath,
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

    await installClaudeReviewHooks(
      paths,
    )

    await installClaudeReviewHooks(
      paths,
    )

    const settings =
      await readSettings(
        paths.settingsPath,
      )

    expect(settings.theme).toBe('dark')

    expect(
      settings.hooks?.SessionStart,
    ).toHaveLength(1)

    expect(
      settings.hooks?.UserPromptSubmit,
    ).toHaveLength(1)

    expect(
      settings.hooks?.Stop,
    ).toHaveLength(2)
  })

  it('removes only Good Manners lifecycle hooks', async () => {
    const paths =
      await fixture()

    await fs.mkdir(
      path.dirname(
        paths.settingsPath,
      ),
      {
        recursive: true,
      },
    )

    await fs.writeFile(
      paths.settingsPath,
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

    await installClaudeReviewHooks(
      paths,
    )

    await removeClaudeReviewHooks(
      paths,
    )

    const settings =
      await readSettings(
        paths.settingsPath,
      )

    expect(settings.theme).toBe('dark')

    expect(
      settings.hooks?.SessionStart,
    ).toBeUndefined()

    expect(
      settings.hooks?.UserPromptSubmit,
    ).toBeUndefined()

    expect(
      settings.hooks?.Stop,
    ).toHaveLength(1)

    expect(
      settings.hooks?.Stop?.[0]
        ?.hooks?.[0]?.command,
    ).toBe('/existing/hook.sh')
  })
})
