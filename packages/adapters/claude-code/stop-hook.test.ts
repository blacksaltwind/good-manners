import {
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

const hookPath = path.resolve(
  'packages/adapters/claude-code/stop-hook.mjs',
)

async function makeRepo() {
  const cwd =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'good-manners-stop-hook-',
      ),
    )

  spawnSync(
    'git',
    ['init', '-q'],
    { cwd },
  )

  return cwd
}

function runHook(
  cwd: string,
  input: Record<string, unknown>,
) {
  const result =
    spawnSync(
      process.execPath,
      [hookPath],
      {
        cwd,
        input:
          JSON.stringify({
            cwd,
            hook_event_name: 'Stop',
            stop_hook_active: false,
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

describe('Claude Code Stop hook', () => {
  it('allows the second stop attempt', async () => {
    const cwd = await makeRepo()

    try {
      await fs.writeFile(
        path.join(cwd, 'App.tsx'),
        '<button>Save</button>',
      )

      const output =
        runHook(cwd, {
          stop_hook_active: true,
        })

      expect(
        output.decision,
      ).toBeUndefined()
    } finally {
      await fs.rm(
        cwd,
        {
          recursive: true,
          force: true,
        },
      )
    }
  })

  it('does not block backend-only changes', async () => {
    const cwd = await makeRepo()

    try {
      await fs.writeFile(
        path.join(cwd, 'server.ts'),
        'export const value = 1',
      )

      const output =
        runHook(cwd, {})

      expect(
        output.decision,
      ).toBeUndefined()
    } finally {
      await fs.rm(
        cwd,
        {
          recursive: true,
          force: true,
        },
      )
    }
  })

  it('blocks once when UI files changed', async () => {
    const cwd = await makeRepo()

    try {
      await fs.writeFile(
        path.join(cwd, 'LoginForm.tsx'),
        '<form><button>Log in</button></form>',
      )

      const output =
        runHook(cwd, {})

      expect(
        output.decision,
      ).toBe('block')

      expect(
        output.reason,
      ).toContain(
        'LoginForm.tsx',
      )

      expect(
        output.reason,
      ).toContain(
        'only automatic correction pass',
      )
    } finally {
      await fs.rm(
        cwd,
        {
          recursive: true,
          force: true,
        },
      )
    }
  })

  it('ignores generated UI files', async () => {
    const cwd = await makeRepo()

    try {
      await fs.mkdir(
        path.join(cwd, 'dist'),
      )

      await fs.writeFile(
        path.join(
          cwd,
          'dist',
          'App.js',
        ),
        'console.log("generated")',
      )

      const output =
        runHook(cwd, {})

      expect(
        output.decision,
      ).toBeUndefined()
    } finally {
      await fs.rm(
        cwd,
        {
          recursive: true,
          force: true,
        },
      )
    }
  })
})
