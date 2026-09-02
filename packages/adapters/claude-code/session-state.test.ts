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
  spawnSync,
} from 'node:child_process'

const adapterRoot = path.resolve(
  'packages/adapters/claude-code',
)

const turnStart = path.join(
  adapterRoot,
  'turn-start.mjs',
)

const stopHook = path.join(
  adapterRoot,
  'stop-hook.mjs',
)

const temporaryDirectories: string[] = []

async function fixture() {
  const root =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'good-manners-non-git-',
      ),
    )

  temporaryDirectories.push(root)

  const home = path.join(root, 'home')
  const project = path.join(root, 'project')

  await fs.mkdir(home)
  await fs.mkdir(project)

  return {
    home,
    project,
  }
}

function runHook({
  hook,
  home,
  project,
  input,
}: {
  hook: string
  home: string
  project: string
  input: Record<string, unknown>
}) {
  const result =
    spawnSync(
      process.execPath,
      [hook],
      {
        cwd: project,
        env: {
          ...process.env,
          HOME: home,
        },
        input:
          JSON.stringify({
            session_id: 'session-test',
            cwd: project,
            ...input,
          }),
        encoding: 'utf8',
      },
    )

  expect(result.status).toBe(0)

  return JSON.parse(
    result.stdout.trim() || '{}',
  ) as {
    decision?: string
    reason?: string
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

describe('Claude session state fallback', () => {
  it('detects UI changes outside a Git repository', async () => {
    const {
      home,
      project,
    } = await fixture()

    await fs.writeFile(
      path.join(project, 'App.tsx'),
      '<button>Before</button>',
    )

    runHook({
      hook: turnStart,
      home,
      project,
      input: {
        hook_event_name:
          'UserPromptSubmit',
      },
    })

    await fs.writeFile(
      path.join(project, 'App.tsx'),
      '<button>After</button>',
    )

    const output = runHook({
      hook: stopHook,
      home,
      project,
      input: {
        hook_event_name: 'Stop',
        stop_hook_active: false,
      },
    })

    expect(
      output.decision,
    ).toBe('block')

    expect(
      output.reason,
    ).toContain('App.tsx')
  })

  it('ignores generated directories in fallback mode', async () => {
    const {
      home,
      project,
    } = await fixture()

    await fs.mkdir(
      path.join(project, 'dist'),
    )

    await fs.writeFile(
      path.join(
        project,
        'dist',
        'App.tsx',
      ),
      'before',
    )

    runHook({
      hook: turnStart,
      home,
      project,
      input: {
        hook_event_name:
          'UserPromptSubmit',
      },
    })

    await fs.writeFile(
      path.join(
        project,
        'dist',
        'App.tsx',
      ),
      'after',
    )

    const output = runHook({
      hook: stopHook,
      home,
      project,
      input: {
        hook_event_name: 'Stop',
        stop_hook_active: false,
      },
    })

    expect(
      output.decision,
    ).toBeUndefined()
  })

  it('removes stale session-state files when a turn starts', async () => {
    const {
      home,
      project,
    } = await fixture()

    const sessionDirectory =
      path.join(
        home,
        '.good-manners',
        'sessions',
      )

    await fs.mkdir(
      sessionDirectory,
      {
        recursive: true,
      },
    )

    const stale =
      path.join(
        sessionDirectory,
        'stale-session.json',
      )

    await fs.writeFile(
      stale,
      '{}',
    )

    const old =
      new Date(
        Date.now() -
        8 * 24 * 60 * 60 * 1000,
      )

    await fs.utimes(
      stale,
      old,
      old,
    )

    runHook({
      hook: turnStart,
      home,
      project,
      input: {
        hook_event_name:
          'UserPromptSubmit',
      },
    })

    await expect(
      fs.access(stale),
    ).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })
})
