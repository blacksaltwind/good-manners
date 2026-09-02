import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(
  fileURLToPath(import.meta.url),
)

const cliRoot = path.resolve(
  scriptDirectory,
  '..',
)

const cli = path.join(
  cliRoot,
  'dist',
  'index.js',
)

const testHome = await fs.mkdtemp(
  path.join(
    os.tmpdir(),
    'good-manners-installer-',
  ),)

const claudeSkill = path.join(
  testHome,
  '.claude',
  'skills',
  'good-manners',
)

const codexSkill = path.join(
  testHome,
  '.codex',
  'skills',
  'good-manners',
)

const env = {
  ...process.env,
  HOME: testHome,
  CODEX_HOME: path.join(
    testHome,
   '.codex',
  ),
}

function run(
  args = [],
) {
  const result = spawnSync(
    process.execPath,
    [cli, ...args],
    {
      env,
      encoding: 'utf8',
    },
 )

  if (result.status !== 0) {
    console.error(result.stdout)
    console.error(result.stderr)

    throw new Error(
      `CLI failed: ${args.join(' ')}`,
    )
  }

  return result.stdout
}

async function exists(
  value,
) {
  try {
    await fs.access(value)
    return true
  } catch {
    return false
  }
}

try {
  /*
   * Fresh install.
   */
  run()

  assert.equal(
    await exists(
      path.join(
        claudeSkill,
        'SKILL.md',
      ),
    ),
    true,
   )

  assert.equal(
    await exists(
      path.join(
        codexSkill,
        'SKILL.md',
      ),
    ),
    true,
   )

  const marker = JSON.parse(
    await fs.readFile(
      path.join(
        claudeSkill,
        '.good-manners-install.json',
      ),
      'utf8',
    ),
  )

  assert.equal(
    marker.owner,
    'good-manners',
  )

  assert.equal(
    Array.isArray(marker.files),
    true,
  )

  assert.equal(
    marker.files.includes('SKILL.md'),
    true,
   )

  /*
   * Status should recognize both installations.
   */
  const status = run([
    'status',
  ])

  assert.match(
    status,
    /^installed\s+Claude Code/m,
  )

  assert.match(
    status,
    /^installed\s+Codex/m,
  )

  /*
   * Update must preserve user-owned files.
   */
  const updateUserFile = path.join(
    claudeSkill,
    'user-update-file.txt',
  )

  await fs.writeFile(
    updateUserFile,
    'KEEP THROUGH UPDATE\n',
  )

  run([
    'update',
  ])

  assert.equal(
    await fs.readFile(
      updateUserFile,
      'utf8',
    ),
    'KEEP THROUGH UPDATE\n',
  )

  assert.equal(
    await exists(
      path.join(
        testHome,
        '.claude',
        'settings.json',
      ),
    ),
    true,
    'Claude hooks were not configured',
  )

  assert.equal(
    await exists(
      path.join(
        testHome,
        '.codex',
        'hooks.json',
      ),
    ),
    true,
    'Codex hooks were not configured',
  )

  /*
   * User-added files must survive uninstall.
   */
  const userFile = path.join(
    claudeSkill,
    'user-file.txt',
  )

  await fs.writeFile(
    userFile,
    'DO NOT DELETE ME\n',
  )

  run([
    'uninstall',
  ])

  assert.equal(
    await exists(userFile),
    true,
    'uninstall deleted a user-owned file',
  )

  assert.equal(
    await exists(codexSkill),
    false,
    'empty owned Codex directory should be removed',
  )

  /*
   * Tampered ownership metadata must never escape the
   * installation directory.
   */
  await fs.rm(
    claudeSkill,
    {
      recursive: true,
      force: true,
    },
  )

  run()

  const protectedFile = path.join(
    testHome,
    'protected.txt',
  )

  await fs.writeFile(
    protectedFile,
    'PROTECTED\n',
  )

  const maliciousMarker = JSON.parse(
    await fs.readFile(
      path.join(
        claudeSkill,
        '.good-manners-install.json',
      ),
      'utf8',
    ),
  )

  maliciousMarker.files.push(
    '../../../protected.txt',
  )

  await fs.writeFile(
    path.join(
      claudeSkill,
      '.good-manners-install.json',
    ),
    JSON.stringify(
      maliciousMarker,
      null,
      2,
    ) + '\n',
  )

  run([
    'uninstall',
  ])

  assert.equal(
    await fs.readFile(
      protectedFile,
      'utf8',
    ),
    'PROTECTED\n',
    'tampered manifest escaped installation root',
  )

  await fs.rm(
    claudeSkill,
    {
      recursive: true,
      force: true,
    },
  )

  /*
   * An unowned existing directory must never be
   * replaced by install.
   */
  await fs.rm(
    claudeSkill,
    {
      recursive: true,
      force: true,
    },
  )

  await fs.mkdir(
    claudeSkill,
    {
      recursive: true,
    },
  )

  const foreignFile = path.join(
    claudeSkill,
    'foreign.txt',
  )

  await fs.writeFile(
    foreignFile,
    'foreign content\n',
  )

  const installOutput = run()

  assert.match(
    installOutput,
    /existing directory is not owned by Good Manners/,
  )

  assert.equal(
    await fs.readFile(
      foreignFile,
      'utf8',
    ),
     'foreign content\n',
  )

  /*
   * Dry run must not mutate an uninstalled target.
   */
  await fs.rm(
    codexSkill,
    {
      recursive: true,
      force: true,
    },
  )

  run([
    'install',
    '--dry-run',
  ])

  assert.equal(
    await exists(codexSkill),
    false,
    'dry run changed the filesystem',
  )

  console.log(
    'Installer safety integration tests passed',
  )
} finally {
  await fs.rm(
    testHome,
    {
      recursive: true,
      force: true,
    },
  )
}
