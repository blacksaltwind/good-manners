import fs from 'node:fs/promises'
import path from 'node:path'
import {
  fileURLToPath,
} from 'node:url'

const scriptDirectory =
  path.dirname(
    fileURLToPath(import.meta.url),
  )

const cliRoot = path.resolve(
  scriptDirectory,
  '..',
)

const repoRoot = path.resolve(
  cliRoot,
  '../..',
)

const source = path.join(
  repoRoot,
  'packages',
  'skill',
  'dist',
  'good-manners',
)

const destination = path.join(
  cliRoot,
  'dist',
  'skill',
  'good-manners',
)

try {
  await fs.access(
    path.join(
      source,
      'SKILL.md',
    ),
  )
} catch {
  throw new Error(
    'Compiled Good Manners skill not found. Build @good-manners/skill first.',
  )
}

await fs.rm(
  destination,
  {
    recursive: true,
    force: true,
  },
)

await fs.mkdir(
  path.dirname(destination),
  {
    recursive: true,
  },
)

await fs.cp(
  source,
  destination,
  {
    recursive: true,
  },
)

const claudeHookSource = path.join(
  repoRoot,
  'packages',
  'adapters',
  'claude-code',
  'stop-hook.mjs',
)

const claudeHookDestination = path.join(
  destination,
  'scripts',
  'claude-code-stop.mjs',
)

await fs.mkdir(
  path.dirname(claudeHookDestination),
  {
    recursive: true,
  },
)

await fs.copyFile(
  claudeHookSource,
  claudeHookDestination,
)


const claudeTurnStartSource = path.join(
  repoRoot,
  'packages',
  'adapters',
  'claude-code',
  'turn-start.mjs',
)

const claudeTurnStartDestination = path.join(
  destination,
  'scripts',
  'claude-code-turn-start.mjs',
)

await fs.copyFile(
  claudeTurnStartSource,
  claudeTurnStartDestination,
)

const claudeSessionStateSource = path.join(
  repoRoot,
  'packages',
  'adapters',
  'claude-code',
  'session-state.mjs',
)

const claudeSessionStateDestination = path.join(
  destination,
  'scripts',
  'session-state.mjs',
)

await fs.copyFile(
  claudeSessionStateSource,
  claudeSessionStateDestination,
)


const codexTurnStartDestination = path.join(
  destination,
  'scripts',
  'codex-turn-start.mjs',
)

const codexStopDestination = path.join(
  destination,
  'scripts',
  'codex-stop.mjs',
)

await fs.copyFile(
  claudeTurnStartSource,
  codexTurnStartDestination,
)

await fs.copyFile(
  claudeHookSource,
  codexStopDestination,
)


const uiFileConfigSource = path.join(
  repoRoot,
  'packages',
  'adapters',
  'claude-code',
  'ui-file-config.mjs',
)

await fs.copyFile(
  uiFileConfigSource,
  path.join(
    destination,
    'scripts',
    'ui-file-config.mjs',
  ),
)

const reviewRuntimeSource = path.join(
  cliRoot,
  'dist',
  'review-runtime.mjs',
)

await fs.copyFile(
  reviewRuntimeSource,
  path.join(
    destination,
    'scripts',
    'review-runtime.mjs',
  ),
)

await fs.rm(
  reviewRuntimeSource,
  {
    force: true,
  },
)

console.log(
  'Bundled Good Manners skill into CLI package',
)
