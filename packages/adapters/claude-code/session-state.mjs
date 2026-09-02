import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  execFileSync,
} from 'node:child_process'

const UI_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.jsx',
  '.tsx',
  '.css',
  '.scss',
  '.sass',
  '.less',
])

const SKIP_PARTS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  'out',
  '.cache',
  '.turbo',
  '.vercel',
])

function isMeaningfulUiFile(filePath) {
  const normalized =
    filePath.replaceAll('\\', '/')

  const parts = normalized.split('/')

  if (
    parts.some(
      (part) =>
        SKIP_PARTS.has(part),
    )
  ) {
    return false
  }

  return UI_EXTENSIONS.has(
    path.extname(
      normalized,
    ).toLowerCase(),
  )
}

function safeSessionId(value) {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9._-]+$/.test(value)
  ) {
    return null
  }

  return value
}

function statePath(sessionId) {
  const safe = safeSessionId(sessionId)

  if (!safe) {
    return null
  }

  return path.join(
    os.homedir(),
    '.good-manners',
    'sessions',
    `${safe}.json`,
  )
}

function gitFiles(cwd) {
  try {
    const output =
      execFileSync(
        'git',
        [
          'ls-files',
          '--cached',
          '--others',
          '--exclude-standard',
        ],
        {
          cwd,
          encoding: 'utf8',
          stdio: [
            'ignore',
            'pipe',
            'ignore',
          ],
        },
      )

    return [
      ...new Set(
        output
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .filter(isMeaningfulUiFile),
      ),
    ].sort()
  } catch {
    return null
  }
}

async function fileFingerprint(
  cwd,
  relativePath,
) {
  try {
    const content =
      await fs.readFile(
        path.join(
          cwd,
          relativePath,
        ),
      )

    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      error.code === 'ENOENT'
    ) {
      return null
    }

    throw error
  }
}

export async function captureUiState(
  cwd,
) {
  const files = gitFiles(cwd)

  if (!files) {
    return null
  }

  const fingerprints = {}

  for (const file of files) {
    fingerprints[file] =
      await fileFingerprint(
        cwd,
        file,
      )
  }

  return fingerprints
}

export async function writeSessionState({
  sessionId,
  cwd,
  files,
}) {
  const target = statePath(sessionId)

  if (!target) {
    return false
  }

  await fs.mkdir(
    path.dirname(target),
    {
      recursive: true,
    },
  )

  const temporary =
    `${target}.tmp`

  await fs.writeFile(
    temporary,
    JSON.stringify(
      {
        version: 1,
        cwd: path.resolve(cwd),
        files,
      },
      null,
      2,
    ) + '\n',
  )

  await fs.rename(
    temporary,
    target,
  )

  return true
}

export async function readSessionState({
  sessionId,
  cwd,
}) {
  const target = statePath(sessionId)

  if (!target) {
    return null
  }

  try {
    const parsed =
      JSON.parse(
        await fs.readFile(
          target,
          'utf8',
        ),
      )

    if (
      parsed?.version !== 1 ||
      parsed.cwd !== path.resolve(cwd) ||
      !parsed.files ||
      typeof parsed.files !== 'object' ||
      Array.isArray(parsed.files)
    ) {
      return null
    }

    return parsed.files
  } catch {
    return null
  }
}

export function changedUiFiles(
  before,
  after,
) {
  const files =
    new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ])

  return [...files]
    .filter(
      (file) =>
        before[file] !== after[file],
    )
    .sort()
}
