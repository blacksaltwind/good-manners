#!/usr/bin/env node

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

type Command =
  | 'install'
  | 'status'
  | 'uninstall'

type Target = {
  name: string
  directory: string
}

type InstallMarker = {
  owner: 'good-manners'
  version: string
  installedAt: string
}

const VERSION = '0.0.1'

const packageRoot = path.resolve(
  import.meta.dirname,
  '..',
)

const repoRoot = path.resolve(
  packageRoot,
  '../..',
)

const skillSource = path.join(
  repoRoot,
  'packages',
  'skill',
  'dist',
  'good-manners',
)

function getTargets(): Target[] {
  const home = os.homedir()

  const codexHome =
    process.env.CODEX_HOME ??
    path.join(home, '.codex')

  return [
    {
      name: 'Claude Code',
      directory: path.join(
        home,
        '.claude',
        'skills',
        'good-manners',
      ),
    },
    {
      name: 'Codex',
      directory: path.join(
        codexHome,
        'skills',
        'good-manners',
      ),
    },
  ]
}

function markerPath(
  directory: string,
): string {
  return path.join(
    directory,
    '.good-manners-install.json',
  )
}

async function pathExists(
  value: string,
): Promise<boolean> {
  try {
    await fs.access(value)
    return true
  } catch {
    return false
  }
}

async function readMarker(
  directory: string,
): Promise<InstallMarker | null> {
  try {
    const raw = await fs.readFile(
      markerPath(directory),
      'utf8',
    )

    const parsed =
      JSON.parse(raw) as Partial<InstallMarker>

    if (
      parsed.owner !== 'good-manners'
    ) {
      return null
    }

    return parsed as InstallMarker
  } catch {
    return null
  }
}

async function assertSkillBuilt() {
  const skillFile = path.join(
    skillSource,
    'SKILL.md',
  )

  if (
    !(await pathExists(skillFile))
  ) {
    console.error(
      'Good Manners skill artifact is missing.',
    )

    console.error(
      'Run: pnpm --filter @good-manners/skill build',
    )

    process.exitCode = 1

    return false
  }

  return true
}

async function installTarget(
  target: Target,
  dryRun: boolean,
) {
  const exists =
    await pathExists(
      target.directory,
    )

  if (exists) {
    const marker =
      await readMarker(
        target.directory,
      )

    if (!marker) {
      console.log(
        `skip  ${target.name}`,
      )

      console.log(
        `      ${target.directory}`,
      )

      console.log(
        '      existing directory is not owned by Good Manners',
      )

      return
    }
  }

  console.log(
    `${dryRun ? 'would install' : 'install'}  ${target.name}`,
  )

  console.log(
    `         ${target.directory}`,
  )

  if (dryRun) {
    return
  }

  await fs.rm(
    target.directory,
    {
      recursive: true,
      force: true,
    },
  )

  await fs.mkdir(
    path.dirname(
      target.directory,
    ),
    {
      recursive: true,
    },
  )

  await fs.cp(
    skillSource,
    target.directory,
    {
      recursive: true,
    },
  )

  const marker: InstallMarker = {
    owner: 'good-manners',
    version: VERSION,
    installedAt:
      new Date().toISOString(),
  }

  await fs.writeFile(
    markerPath(
      target.directory,
    ),
    JSON.stringify(
      marker,
      null,
      2,
    ) + '\n',
  )
}

async function install(
  dryRun: boolean,
) {
  if (
    !(await assertSkillBuilt())
  ) {
    return
  }

  console.log(
    'Good Manners',
  )

  for (
    const target of getTargets()
  ) {
    await installTarget(
      target,
      dryRun,
    )
  }

  if (!dryRun) {
    console.log('')
    console.log(
      'Good manners installed.',
    )
  }
}

async function status() {
  console.log(
    'Good Manners status',
  )

  for (
    const target of getTargets()
  ) {
    const marker =
      await readMarker(
        target.directory,
      )

    if (marker) {
      console.log(
        `installed  ${target.name}`,
      )

      console.log(
        `           ${target.directory}`,
      )

      console.log(
        `           version ${marker.version}`,
      )
    } else {
      console.log(
        `not installed  ${target.name}`,
      )

      console.log(
        `               ${target.directory}`,
      )
    }
  }
}

async function uninstallTarget(
  target: Target,
  dryRun: boolean,
) {
  const exists =
    await pathExists(
      target.directory,
    )

  if (!exists) {
    console.log(
      `not installed  ${target.name}`,
    )

    return
  }

  const marker =
    await readMarker(
      target.directory,
    )

  if (!marker) {
    console.log(
      `skip  ${target.name}`,
    )

    console.log(
      '      directory is not owned by Good Manners',
    )

    return
  }

  console.log(
    `${dryRun ? 'would remove' : 'remove'}  ${target.name}`,
  )

  console.log(
    `        ${target.directory}`,
  )

  if (dryRun) {
    return
  }

  await fs.rm(
    target.directory,
    {
      recursive: true,
      force: true,
    },
  )
}

async function uninstall(
  dryRun: boolean,
) {
  for (
    const target of getTargets()
  ) {
    await uninstallTarget(
      target,
      dryRun,
    )
  }
}

function parseCommand(): {
  command: Command
  dryRun: boolean
} {
  const args =
    process.argv.slice(2)

  const dryRun =
    args.includes('--dry-run')

  const positional =
    args.filter(
      (arg) =>
        !arg.startsWith('--'),
    )

  const raw =
    positional[0] ??
    'install'

  if (
    raw !== 'install' &&
    raw !== 'status' &&
    raw !== 'uninstall'
  ) {
    console.error(
      `Unknown command: ${raw}`,
    )

    console.error(
      'Usage: good-manners [install|status|uninstall] [--dry-run]',
    )

    process.exit(1)
  }

  return {
    command: raw,
    dryRun,
  }
}

async function main() {
  const {
    command,
    dryRun,
  } = parseCommand()

  if (command === 'install') {
    await install(dryRun)
    return
  }

  if (command === 'status') {
    await status()
    return
  }

  await uninstall(dryRun)
}

await main()
