#!/usr/bin/env node

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  installClaudeStopHook,
  removeClaudeStopHook,
} from './claude-settings.js'

import { checkPath } from '@good-manners/checker'

type Command =
  | 'install'
  | 'check'
  | 'status'
  | 'update'
  | 'uninstall'

type Target = {
  name: string
  directory: string
}

type InstallMarker = {
  owner: 'good-manners'
  version: string
  installedAt: string
  files: string[]
}

const VERSION = '0.0.1'

const packageRoot = path.resolve(
  import.meta.dirname,
  '..',
)

const skillSource = path.join(
  packageRoot,
  'dist',
  'skill',
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

async function listOwnedFiles(
  root: string,
): Promise<string[]> {
  const files: string[] = []

  async function walk(
    directory: string,
  ) {
    const entries =
      await fs.readdir(
        directory,
        {
          withFileTypes: true,
        },
      )

    for (const entry of entries) {
      const absolute =
        path.join(
          directory,
          entry.name,
        )

      if (entry.isDirectory()) {
        await walk(absolute)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      if (
        entry.name ===
        '.good-manners-install.json'
      ) {
        continue
      }

      files.push(
        path.relative(
          root,
          absolute,
        ),
      )
    }
  }

  await walk(root)

  return files.sort()
}

async function removeEmptyDirectories(
  root: string,
) {
  if (
    !(await pathExists(root))
  ) {
    return
  }

  const entries =
    await fs.readdir(
      root,
      {
        withFileTypes: true,
      },
    )

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    await removeEmptyDirectories(
      path.join(
        root,
        entry.name,
      ),
    )
  }

  try {
    await fs.rmdir(root)
  } catch {
    // Preserve directories containing unowned files.
  }
}

function isSafeOwnedPath(
  value: unknown,
): value is string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.includes('\0') ||
    path.isAbsolute(value)
  ) {
    return false
  }

  const normalized = path.normalize(value)

  if (
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith(
      `..${path.sep}`,
    )
  ) {
    return false
  }

  return true
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
      parsed.owner !== 'good-manners' ||
      !Array.isArray(parsed.files) ||
      !parsed.files.every(isSafeOwnedPath)
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

  const previousMarker =
    exists
      ? await readMarker(
          target.directory,
        )
      : null

  if (
    exists &&
    !previousMarker
  ) {
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

  console.log(
    `${dryRun ? 'would install' : 'install'}  ${target.name}`,
  )

  console.log(
    `         ${target.directory}`,
  )

  if (dryRun) {
    return
  }

  const targetParent =
    path.dirname(
      target.directory,
    )

  await fs.mkdir(
    targetParent,
    {
      recursive: true,
    },
  )

  const stageContainer =
    await fs.mkdtemp(
      path.join(
        targetParent,
        '.good-manners-stage-',
      ),
    )

  const backupContainer =
    await fs.mkdtemp(
      path.join(
        targetParent,
        '.good-manners-backup-',
      ),
    )

  const stageRoot =
    path.join(
      stageContainer,
      'good-manners',
    )

  const backupRoot =
    path.join(
      backupContainer,
      'good-manners',
    )

  let newFiles: string[] = []
  let mutationStarted = false

  try {
    await fs.cp(
      skillSource,
      stageRoot,
      {
        recursive: true,
      },
    )

    newFiles =
      await listOwnedFiles(
        stageRoot,
      )

    const previousFiles =
      previousMarker?.files ?? []

    const previousOwned =
      new Set(
        previousFiles,
      )

    /*
     * A newly introduced Good Manners file must not
     * overwrite a user-owned file that happens to use
     * the same path.
     */
    for (
      const relativePath of newFiles
    ) {
      if (
        previousOwned.has(
          relativePath,
        )
      ) {
        continue
      }

      const destination =
        path.join(
          target.directory,
          relativePath,
        )

      if (
        await pathExists(
          destination,
        )
      ) {
        throw new Error(
          `Refusing to overwrite unowned file: ${destination}`,
        )
      }
    }

    /*
     * Back up only files already owned by Good Manners.
     * Unknown files are deliberately untouched.
     */
    for (
      const relativePath of previousFiles
    ) {
      const source =
        path.join(
          target.directory,
          relativePath,
        )

      if (
        !(await pathExists(source))
      ) {
        continue
      }

      const backup =
        path.join(
          backupRoot,
          relativePath,
        )

      await fs.mkdir(
        path.dirname(backup),
        {
          recursive: true,
        },
      )

      await fs.copyFile(
        source,
        backup,
      )
    }

    mutationStarted = true

    await fs.mkdir(
      target.directory,
      {
        recursive: true,
      },
    )

    const newFileSet =
      new Set(newFiles)

    /*
     * Remove owned files that disappeared from the new
     * release. User files are never in previousFiles.
     */
    for (
      const relativePath of previousFiles
    ) {
      if (
        newFileSet.has(
          relativePath,
        )
      ) {
        continue
      }

      await fs.rm(
        path.join(
          target.directory,
          relativePath,
        ),
        {
          force: true,
        },
      )
    }

    /*
     * Copy the completely staged release into the live
     * installation one file at a time.
     */
    for (
      const relativePath of newFiles
    ) {
      const source =
        path.join(
          stageRoot,
          relativePath,
        )

      const destination =
        path.join(
          target.directory,
          relativePath,
        )

      await fs.mkdir(
        path.dirname(
          destination,
        ),
        {
          recursive: true,
        },
      )

      await fs.copyFile(
        source,
        destination,
      )
    }

    const marker: InstallMarker = {
      owner: 'good-manners',
      version: VERSION,
      installedAt:
        previousMarker?.installedAt ??
        new Date().toISOString(),
      files: newFiles,
    }

    const finalMarker =
      markerPath(
        target.directory,
      )

    const temporaryMarker =
      `${finalMarker}.tmp`

    await fs.writeFile(
      temporaryMarker,
      JSON.stringify(
        marker,
        null,
        2,
      ) + '\n',
    )

    /*
     * Commit ownership metadata last.
     */
    await fs.rename(
      temporaryMarker,
      finalMarker,
    )
  } catch (error) {
    if (mutationStarted) {
      const previousFiles =
        previousMarker?.files ?? []

      const rollbackFiles =
        new Set([
          ...previousFiles,
          ...newFiles,
        ])

      /*
       * Remove files written by the failed attempt,
       * then restore the previous owned files.
       * Unknown files are untouched.
       */
      for (
        const relativePath of rollbackFiles
      ) {
        await fs.rm(
          path.join(
            target.directory,
            relativePath,
          ),
          {
            force: true,
          },
        )
      }

      for (
        const relativePath of previousFiles
      ) {
        const backup =
          path.join(
            backupRoot,
            relativePath,
          )

        if (
          !(await pathExists(backup))
        ) {
          continue
        }

        const destination =
          path.join(
            target.directory,
            relativePath,
          )

        await fs.mkdir(
          path.dirname(
            destination,
          ),
          {
            recursive: true,
          },
        )

        await fs.copyFile(
          backup,
          destination,
        )
      }

      const finalMarker =
        markerPath(
          target.directory,
        )

      await fs.rm(
        `${finalMarker}.tmp`,
        {
          force: true,
        },
      )

      if (previousMarker) {
        await fs.writeFile(
          finalMarker,
          JSON.stringify(
            previousMarker,
            null,
            2,
          ) + '\n',
        )
      } else {
        await fs.rm(
          finalMarker,
          {
            force: true,
          },
        )

        await removeEmptyDirectories(
          target.directory,
        )
      }
    }

    throw error
  } finally {
    await fs.rm(
      stageContainer,
      {
        recursive: true,
        force: true,
      },
    )

    await fs.rm(
      backupContainer,
      {
        recursive: true,
        force: true,
      },
    )
  }
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

  for (const relativePath of marker.files) {
    await fs.rm(
      path.join(
        target.directory,
        relativePath,
      ),
      {
        force: true,
      },
    )
  }

  await fs.rm(
    markerPath(
      target.directory,
    ),
    {
      force: true,
    },
  )

  await removeEmptyDirectories(
    target.directory,
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

async function check(
  target: string,
) {
  let issues

  try {
    issues = await checkPath(target)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error)

    console.error(
      `Error: ${message}`,
    )

    process.exitCode = 2
    return
  }

  if (issues.length === 0) {
    console.log(
      'Good Manners: no deterministic UX issues found.',
   )
    return
  }

  for (const issue of issues) {
    const location =
      issue.file
        ? `${path.relative(process.cwd(), issue.file)}:${issue.line}:${issue.column}`
        : `${issue.line}:${issue.column}`

    console.log(
      `${location}  ${issue.id}  ${issue.message}`,
    )

    if (issue.snippet) {
      console.log(
        `  ${issue.snippet}`,
      )
    }
  }

  console.log('')
  console.log(
    `${issues.length} issue${issues.length === 1 ? '' : 's'} found.`,
  )

  process.exitCode = 1
}

function getClaudeIntegrationPaths() {
  const skillDirectory =
    path.join(
      os.homedir(),
      '.claude',
      'skills',
      'good-manners',
    )

  return {
    skillDirectory,
    settingsPath:
      path.join(
        os.homedir(),
        '.claude',
        'settings.json',
      ),
    hookPath:
      path.join(
        skillDirectory,
        'scripts',
        'claude-code-stop.mjs',
      ),
  }
}

async function configureClaudeIntegration(
  dryRun: boolean,
) {
  if (dryRun) {
    return
  }

  const {
    skillDirectory,
    settingsPath,
    hookPath,
  } = getClaudeIntegrationPaths()

  const marker =
    await readMarker(
      skillDirectory,
    )

  if (!marker) {
    return
  }

  if (
    !(await pathExists(hookPath))
  ) {
    return
  }

  await installClaudeStopHook({
    settingsPath,
    hookPath,
  })
}

async function removeClaudeIntegration(
  dryRun: boolean,
) {
  if (dryRun) {
    return
  }

  const {
    skillDirectory,
    settingsPath,
    hookPath,
  } = getClaudeIntegrationPaths()

  const marker =
    await readMarker(
      skillDirectory,
    )

  if (!marker) {
    return
  }

  await removeClaudeStopHook({
    settingsPath,
    hookPath,
  })
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
    raw !== 'update' &&
    raw !== 'check' &&
    raw !== 'uninstall'
  ) {
    console.error(
      `Unknown command: ${raw}`,
    )

    console.error(
      'Usage: good-manners [install|status|update|uninstall|check] [path] [--dry-run]',
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
    await configureClaudeIntegration(dryRun)
    return
  }

  if (command === 'status') {
    await status()
    return
  }

  if (command === 'update') {
    await install(dryRun)
    await configureClaudeIntegration(dryRun)
    return
  }

  if (command === 'check') {
    const positional =
      process.argv
        .slice(2)
        .filter(
          (arg) =>
            !arg.startsWith('--'),
        )

    const target =
      positional[1] ?? '.'

    await check(target)
    return
  }

  await removeClaudeIntegration(dryRun)
  await uninstall(dryRun)
}

await main()
