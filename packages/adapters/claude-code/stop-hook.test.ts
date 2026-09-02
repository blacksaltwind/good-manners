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

async function makeFixture() {
  const root =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'good-manners-session-hook-',
      ),
    )

  temporaryDirectories.push(root)

  const home = path.join(root, 'home')
  const repo = path.join(root, 'repo')

  await fs.mkdir(home)
  await fs.mkdir(repo)

  spawnSync(
    'git',
    ['init', '-q'],
    {
      cwd: repo,
    },
  )

  return {
    home,
    repo,
  }
}

function runHook({
  hook,
  home,
  repo,
  input,
}: {
  hook: string
  home: string
  repo: string
  input: Record<string, unknown>
}) {
  const result =
    spawnSync(
      process.execPath,
      [hook],
      {
        cwd: repo,
        env: {
          ...process.env,
          HOME: home,
        },
        input:
          JSON.stringify({
            session_id: 'session-test',
            cwd: repo,
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

describe('Claude session-aware UX review hooks', () => {
  it('does not review UI changes that already existed before the turn', async () => {
    const {
      home,
      repo,
    } = await makeFixture()

    await fs.writeFile(
      path.join(repo, 'App.tsx'),
      '<button>Already dirty</button>',
    )

    runHook({
      hook: turnStart,
      home,
      repo,
      input: {
        hook_event_name:
          'UserPromptSubmit',
      },
    })

    const output = runHook({
      hook: stopHook,
      home,
      repo,
      input: {
        hook_event_name: 'Stop',
        stop_hook_active: false,
      },
    })

    expect(
      output.decision,
    ).toBeUndefined()
  })

  it('reviews a UI file modified after the turn baseline', async () => {
    const {
      home,
      repo,
    } = await makeFixture()

    await fs.writeFile(
      path.join(repo, 'App.tsx'),
      '<button>Before</button>',
    )

    runHook({
      hook: turnStart,
      home,
      repo,
      input: {
        hook_event_name:
          'UserPromptSubmit',
      },
    })

    await fs.writeFile(
      path.join(repo, 'App.tsx'),
      '<button>After</button>',
    )

    const output = runHook({
      hook: stopHook,
      home,
      repo,
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

  it('commits the corrected state after the one review pass', async () => {
    const {
      home,
      repo,
    } = await makeFixture()

    await fs.writeFile(
      path.join(repo, 'App.tsx'),
      '<button>Before</button>',
    )

    runHook({
      hook: turnStart,
      home,
      repo,
      input: {
        hook_event_name:
          'UserPromptSubmit',
      },
    })

    await fs.writeFile(
      path.join(repo, 'App.tsx'),
      '<button>Changed</button>',
    )

    expect(
      runHook({
        hook: stopHook,
        home,
        repo,
        input: {
          hook_event_name: 'Stop',
          stop_hook_active: false,
        },
      }).decision,
    ).toBe('block')

    await fs.writeFile(
      path.join(repo, 'App.tsx'),
      '<button>Corrected</button>',
    )

    expect(
      runHook({
        hook: stopHook,
        home,
        repo,
        input: {
          hook_event_name: 'Stop',
          stop_hook_active: true,
        },
      }).decision,
    ).toBeUndefined()

    expect(
      runHook({
        hook: stopHook,
        home,
        repo,
        input: {
          hook_event_name: 'Stop',
          stop_hook_active: false,
        },
      }).decision,
    ).toBeUndefined()
  })

  it('does not reset the turn baseline during compaction', async () => {
    const {
      home,
      repo,
    } = await makeFixture()

    await fs.writeFile(
      path.join(repo, 'App.tsx'),
      '<button>Before</button>',
    )

    runHook({
      hook: turnStart,
      home,
      repo,
      input: {
        hook_event_name:
          'SessionStart',
        source: 'startup',
      },
    })

    await fs.writeFile(
      path.join(repo, 'App.tsx'),
      '<button>Changed</button>',
    )

    runHook({
      hook: turnStart,
      home,
      repo,
      input: {
        hook_event_name:
          'SessionStart',
        source: 'compact',
      },
    })

    const output = runHook({
      hook: stopHook,
      home,
      repo,
      input: {
        hook_event_name: 'Stop',
        stop_hook_active: false,
      },
    })

    expect(
      output.decision,
    ).toBe('block')
  })
})
