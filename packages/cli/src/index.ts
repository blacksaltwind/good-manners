#!/usr/bin/env node
import { installCodexReviewHooks, removeCodexReviewHooks } from './codex-hooks.js'

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { installClaudeReviewHooks, removeClaudeReviewHooks } from './claude-settings.js'

import { checkPath } from '../../checker/src/index.js'

import { getRulesOutput } from './rules.js'

import { formatEvalReport, runGoodMannersEval } from './eval.js'

import {
  bold,
  command,
  detail,
  failure,
  header,
  info,
  muted,
  success,
  warning,
} from './terminal.js'

type Command =
  'install' | 'check' | 'rules' | 'eval' | 'status' | 'update' | 'uninstall' | 'help' | 'version'

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

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

const packageRoot = path.resolve(moduleDirectory, '..')

const packageMetadata = JSON.parse(
  await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'),
) as { version: string }

const VERSION = packageMetadata.version

const skillSource = path.join(packageRoot, 'dist', 'skill', 'good-manners')

function getTargets(): Target[] {
  const home = os.homedir()

  const codexHome = process.env.CODEX_HOME ?? path.join(home, '.codex')

  return [
    {
      name: 'Claude Code',
      directory: path.join(home, '.claude', 'skills', 'good-manners'),
    },
    {
      name: 'Codex',
      directory: path.join(codexHome, 'skills', 'good-manners'),
    },
  ]
}

function markerPath(directory: string): string {
  return path.join(directory, '.good-manners-install.json')
}

async function pathExists(value: string): Promise<boolean> {
  try {
    await fs.access(value)
    return true
  } catch {
    return false
  }
}

async function listOwnedFiles(root: string): Promise<string[]> {
  const files: string[] = []

  async function walk(directory: string) {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    })

    for (const entry of entries) {
      const absolute = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        await walk(absolute)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      if (entry.name === '.good-manners-install.json') {
        continue
      }

      files.push(path.relative(root, absolute))
    }
  }

  await walk(root)

  return files.sort()
}

async function removeEmptyDirectories(root: string) {
  if (!(await pathExists(root))) {
    return
  }

  const entries = await fs.readdir(root, {
    withFileTypes: true,
  })

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    await removeEmptyDirectories(path.join(root, entry.name))
  }

  try {
    await fs.rmdir(root)
  } catch {
    // Preserve directories containing unowned files.
  }
}

function isSafeOwnedPath(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.includes('\0') ||
    path.isAbsolute(value)
  ) {
    return false
  }

  const normalized = path.normalize(value)

  if (normalized === '.' || normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
    return false
  }

  return true
}

async function readMarker(directory: string): Promise<InstallMarker | null> {
  try {
    const raw = await fs.readFile(markerPath(directory), 'utf8')

    const parsed = JSON.parse(raw) as Partial<InstallMarker>

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
  const skillFile = path.join(skillSource, 'SKILL.md')

  if (!(await pathExists(skillFile))) {
    console.error('Good Manners skill artifact is missing.')

    console.error('Run: pnpm --filter @good-manners/skill build')

    process.exitCode = 1

    return false
  }

  return true
}

async function installTarget(target: Target, dryRun: boolean) {
  const exists = await pathExists(target.directory)

  const previousMarker = exists ? await readMarker(target.directory) : null

  if (exists && !previousMarker) {
    console.log(`skip  ${target.name}`)

    console.log(`      ${target.directory}`)

    console.log('      existing directory is not owned by Good Manners')

    return
  }

  console.log(`${dryRun ? 'would install' : 'install'}  ${target.name}`)

  console.log(`         ${target.directory}`)

  if (dryRun) {
    return
  }

  const targetParent = path.dirname(target.directory)

  await fs.mkdir(targetParent, {
    recursive: true,
  })

  const stageContainer = await fs.mkdtemp(path.join(targetParent, '.good-manners-stage-'))

  const backupContainer = await fs.mkdtemp(path.join(targetParent, '.good-manners-backup-'))

  const stageRoot = path.join(stageContainer, 'good-manners')

  const backupRoot = path.join(backupContainer, 'good-manners')

  let newFiles: string[] = []
  let mutationStarted = false

  try {
    await fs.cp(skillSource, stageRoot, {
      recursive: true,
    })

    newFiles = await listOwnedFiles(stageRoot)

    const previousFiles = previousMarker?.files ?? []

    const previousOwned = new Set(previousFiles)

    /*
     * A newly introduced Good Manners file must not
     * overwrite a user-owned file that happens to use
     * the same path.
     */
    for (const relativePath of newFiles) {
      if (previousOwned.has(relativePath)) {
        continue
      }

      const destination = path.join(target.directory, relativePath)

      if (await pathExists(destination)) {
        throw new Error(`Refusing to overwrite unowned file: ${destination}`)
      }
    }

    /*
     * Back up only files already owned by Good Manners.
     * Unknown files are deliberately untouched.
     */
    for (const relativePath of previousFiles) {
      const source = path.join(target.directory, relativePath)

      if (!(await pathExists(source))) {
        continue
      }

      const backup = path.join(backupRoot, relativePath)

      await fs.mkdir(path.dirname(backup), {
        recursive: true,
      })

      await fs.copyFile(source, backup)
    }

    mutationStarted = true

    await fs.mkdir(target.directory, {
      recursive: true,
    })

    const newFileSet = new Set(newFiles)

    /*
     * Remove owned files that disappeared from the new
     * release. User files are never in previousFiles.
     */
    for (const relativePath of previousFiles) {
      if (newFileSet.has(relativePath)) {
        continue
      }

      await fs.rm(path.join(target.directory, relativePath), {
        force: true,
      })
    }

    /*
     * Copy the completely staged release into the live
     * installation one file at a time.
     */
    for (const relativePath of newFiles) {
      const source = path.join(stageRoot, relativePath)

      const destination = path.join(target.directory, relativePath)

      await fs.mkdir(path.dirname(destination), {
        recursive: true,
      })

      await fs.copyFile(source, destination)
    }

    const marker: InstallMarker = {
      owner: 'good-manners',
      version: VERSION,
      installedAt: previousMarker?.installedAt ?? new Date().toISOString(),
      files: newFiles,
    }

    const finalMarker = markerPath(target.directory)

    const temporaryMarker = `${finalMarker}.tmp`

    await fs.writeFile(temporaryMarker, JSON.stringify(marker, null, 2) + '\n')

    /*
     * Commit ownership metadata last.
     */
    await fs.rename(temporaryMarker, finalMarker)
  } catch (error) {
    if (mutationStarted) {
      const previousFiles = previousMarker?.files ?? []

      const rollbackFiles = new Set([...previousFiles, ...newFiles])

      /*
       * Remove files written by the failed attempt,
       * then restore the previous owned files.
       * Unknown files are untouched.
       */
      for (const relativePath of rollbackFiles) {
        await fs.rm(path.join(target.directory, relativePath), {
          force: true,
        })
      }

      for (const relativePath of previousFiles) {
        const backup = path.join(backupRoot, relativePath)

        if (!(await pathExists(backup))) {
          continue
        }

        const destination = path.join(target.directory, relativePath)

        await fs.mkdir(path.dirname(destination), {
          recursive: true,
        })

        await fs.copyFile(backup, destination)
      }

      const finalMarker = markerPath(target.directory)

      await fs.rm(`${finalMarker}.tmp`, {
        force: true,
      })

      if (previousMarker) {
        await fs.writeFile(finalMarker, JSON.stringify(previousMarker, null, 2) + '\n')
      } else {
        await fs.rm(finalMarker, {
          force: true,
        })

        await removeEmptyDirectories(target.directory)
      }
    }

    throw error
  } finally {
    await fs.rm(stageContainer, {
      recursive: true,
      force: true,
    })

    await fs.rm(backupContainer, {
      recursive: true,
      force: true,
    })
  }
}

async function install(dryRun: boolean, mode: 'install' | 'update' = 'install') {
  if (!(await assertSkillBuilt())) {
    return
  }

  console.log(mode === 'update' ? header('update') : header())
  console.log('')

  for (const target of getTargets()) {
    await installTarget(target, dryRun)
  }

  console.log('')

  if (dryRun) {
    console.log(info('No changes made.'))
    return
  }

  console.log(success(mode === 'update' ? 'Good Manners updated.' : 'Good Manners installed.'))
  console.log(detail('Ready. Keep building normally.'))
}

async function status() {
  console.log(header('status'))
  console.log('')

  const targets = getTargets()
  let installed = 0

  for (const target of targets) {
    const marker = await readMarker(target.directory)

    if (marker) {
      installed += 1
      console.log(success(bold(target.name)))
      console.log(detail(`installed · v${marker.version}`))
      console.log(detail(target.directory))
    } else {
      console.log(warning(bold(target.name)))
      console.log(detail('not installed'))
      console.log(detail(target.directory))
    }

    console.log('')
  }

  console.log(`${installed} / ${targets.length} integrations ready`)
}

async function uninstallTarget(target: Target, dryRun: boolean) {
  const exists = await pathExists(target.directory)

  if (!exists) {
    console.log(`not installed  ${target.name}`)

    return
  }

  const marker = await readMarker(target.directory)

  if (!marker) {
    console.log(`skip  ${target.name}`)

    console.log('      directory is not owned by Good Manners')

    return
  }

  console.log(`${dryRun ? 'would remove' : 'remove'}  ${target.name}`)

  console.log(`        ${target.directory}`)

  if (dryRun) {
    return
  }

  for (const relativePath of marker.files) {
    await fs.rm(path.join(target.directory, relativePath), {
      force: true,
    })
  }

  await fs.rm(markerPath(target.directory), {
    force: true,
  })

  await removeEmptyDirectories(target.directory)
}

async function uninstall(dryRun: boolean) {
  console.log(header('uninstall'))
  console.log('')

  for (const target of getTargets()) {
    await uninstallTarget(target, dryRun)
  }

  console.log('')

  console.log(dryRun ? info('No changes made.') : success('Good Manners uninstalled.'))
}

async function check(target: string) {
  let issues

  try {
    issues = await checkPath(target)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    console.error(failure(`Good Manners check failed: ${message}`))

    process.exitCode = 2
    return
  }

  console.log(header('check'))
  console.log('')

  if (issues.length === 0) {
    console.log(success('No deterministic UX issues found.'))
    return
  }

  for (const issue of issues) {
    const location = issue.file
      ? `${path.relative(process.cwd(), issue.file)}:${issue.line}:${issue.column}`
      : `${issue.line}:${issue.column}`

    const renderIssue = issue.severity === 'error' ? failure : warning

    console.log(renderIssue(`${issue.id}  ${issue.message}`))
    console.log(detail(location))

    if (issue.snippet) {
      console.log(detail(issue.snippet))
    }

    console.log('')
  }

  const errors = issues.filter((issue) => issue.severity === 'error').length
  const warnings = issues.length - errors

  console.log(`${issues.length} issue${issues.length === 1 ? '' : 's'}`)
  console.log(
    detail(
      `${errors} error${errors === 1 ? '' : 's'} · ${warnings} warning${warnings === 1 ? '' : 's'}`,
    ),
  )

  process.exitCode = 1
}

function getClaudeIntegrationPaths() {
  const skillDirectory = path.join(os.homedir(), '.claude', 'skills', 'good-manners')

  return {
    skillDirectory,
    settingsPath: path.join(os.homedir(), '.claude', 'settings.json'),
    stopHookPath: path.join(skillDirectory, 'scripts', 'claude-code-stop.mjs'),
    turnStartHookPath: path.join(skillDirectory, 'scripts', 'claude-code-turn-start.mjs'),
  }
}

async function configureClaudeIntegration(dryRun: boolean) {
  if (dryRun) {
    return
  }

  const { skillDirectory, settingsPath, stopHookPath, turnStartHookPath } =
    getClaudeIntegrationPaths()

  const marker = await readMarker(skillDirectory)

  if (!marker) {
    return
  }

  if (!(await pathExists(stopHookPath)) || !(await pathExists(turnStartHookPath))) {
    return
  }

  await installClaudeReviewHooks({
    settingsPath,
    stopHookPath,
    turnStartHookPath,
  })
}

async function removeClaudeIntegration(dryRun: boolean) {
  if (dryRun) {
    return
  }

  const { skillDirectory, settingsPath, stopHookPath, turnStartHookPath } =
    getClaudeIntegrationPaths()

  const marker = await readMarker(skillDirectory)

  if (!marker) {
    return
  }

  await removeClaudeReviewHooks({
    settingsPath,
    stopHookPath,
    turnStartHookPath,
  })
}

function getCodexIntegrationPaths() {
  const codexRoot = process.env.CODEX_HOME?.trim() || path.join(os.homedir(), '.codex')

  const skillDirectory = path.join(codexRoot, 'skills', 'good-manners')

  return {
    skillDirectory,
    hooksPath: path.join(codexRoot, 'hooks.json'),
    turnStartPath: path.join(skillDirectory, 'scripts', 'codex-turn-start.mjs'),
    stopPath: path.join(skillDirectory, 'scripts', 'codex-stop.mjs'),
  }
}

async function configureCodexIntegration(dryRun: boolean) {
  if (dryRun) {
    return
  }

  const { skillDirectory, hooksPath, turnStartPath, stopPath } = getCodexIntegrationPaths()

  const marker = await readMarker(skillDirectory)

  if (!marker) {
    return
  }

  if (!(await pathExists(turnStartPath)) || !(await pathExists(stopPath))) {
    return
  }

  const changed = await installCodexReviewHooks({
    hooksPath,
    turnStartPath,
    stopPath,
  })

  if (changed) {
    console.log(success('Codex review hooks configured.'))
    console.log(detail('Run /hooks in Codex to review and trust them.'))
  }
}

async function removeCodexIntegration(dryRun: boolean) {
  if (dryRun) {
    return
  }

  const { skillDirectory, hooksPath, turnStartPath, stopPath } = getCodexIntegrationPaths()

  const marker = await readMarker(skillDirectory)

  if (!marker) {
    return
  }

  await removeCodexReviewHooks({
    hooksPath,
    turnStartPath,
    stopPath,
  })
}

function printHelp() {
  console.log(
    [
      header(),
      '',
      bold('Usage'),
      `  ${command('good-manners')} ${muted('[command] [options]')}`,
      '',
      bold('Commands'),
      `  ${command('install'.padEnd(22))}${muted('Install Good Manners')}`,
      `  ${command('status'.padEnd(22))}${muted('Show installation status')}`,
      `  ${command('update'.padEnd(22))}${muted('Update Good Manners')}`,
      `  ${command('uninstall'.padEnd(22))}${muted('Remove Good Manners')}`,
      `  ${command('check [path]'.padEnd(22))}${muted('Check deterministic UX issues')}`,
      `  ${command('rules [query]'.padEnd(22))}${muted('Browse the UX rule catalog')}`,
      `  ${command('eval [--json]'.padEnd(22))}${muted('Run the quality eval suite')}`,
      '',
      bold('Options'),
      `  ${command('--dry-run'.padEnd(22))}${muted('Preview changes')}`,
      `  ${command('--help, -h'.padEnd(22))}${muted('Show help')}`,
      `  ${command('--version, -v'.padEnd(22))}${muted('Show version')}`,
      '',
      muted('Good UX is just good manners.'),
    ].join('\n'),
  )
}

type ParsedCommand = {
  command: Command
  dryRun: boolean
  json: boolean
  args: string[]
}

function parseCommand(): ParsedCommand {
  const argv = process.argv.slice(2)

  const allowedFlags = new Set(['--dry-run', '--json', '--help', '-h', '--version', '-v'])

  const unknownFlag = argv.find((arg) => arg.startsWith('-') && !allowedFlags.has(arg))

  if (unknownFlag) {
    console.error(failure(`Unknown option: ${unknownFlag}`))
    printHelp()
    process.exit(1)
  }

  if (argv.includes('--help') || argv.includes('-h')) {
    return {
      command: 'help',
      dryRun: false,
      json: false,
      args: [],
    }
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    return {
      command: 'version',
      dryRun: false,
      json: false,
      args: [],
    }
  }

  const dryRun = argv.includes('--dry-run')
  const json = argv.includes('--json')

  const positional = argv.filter((arg) => !arg.startsWith('-'))

  const raw = positional[0] ?? 'install'

  const commands = new Set<Command>([
    'install',
    'check',
    'rules',
    'eval',
    'status',
    'update',
    'uninstall',
  ])

  if (!commands.has(raw as Command)) {
    console.error(failure(`Unknown command: ${raw}`))
    printHelp()
    process.exit(1)
  }

  if (json && raw !== 'eval') {
    console.error('--json is only valid with good-manners eval.')
    printHelp()
    process.exit(1)
  }

  return {
    command: raw as Command,
    dryRun,
    json,
    args: positional.slice(1),
  }
}

async function main() {
  const { command, dryRun, json, args } = parseCommand()

  if (command === 'help') {
    printHelp()
    return
  }

  if (command === 'version') {
    console.log(VERSION)
    return
  }

  if (command === 'install') {
    await install(dryRun, 'install')
    await configureClaudeIntegration(dryRun)
    await configureCodexIntegration(dryRun)
    return
  }

  if (command === 'status') {
    await status()
    return
  }

  if (command === 'update') {
    await install(dryRun, 'update')
    await configureClaudeIntegration(dryRun)
    await configureCodexIntegration(dryRun)
    return
  }

  if (command === 'check') {
    await check(args[0] ?? '.')
    return
  }

  if (command === 'rules') {
    console.log(await getRulesOutput(args.join(' ')))
    return
  }

  if (command === 'eval') {
    try {
      const report = await runGoodMannersEval()

      console.log(json ? JSON.stringify(report, null, 2) : formatEvalReport(report))

      process.exitCode = report.passed ? 0 : 1
    } catch (error) {
      console.error(
        'Good Manners eval failed: ' + (error instanceof Error ? error.message : String(error)),
      )

      process.exitCode = 2
    }

    return
  }

  await removeClaudeIntegration(dryRun)
  await removeCodexIntegration(dryRun)
  await uninstall(dryRun)
}

await main()
