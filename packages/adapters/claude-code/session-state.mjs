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

const DEFAULT_SESSION_MAX_AGE_MS =
  7 * 24 * 60 * 60 * 1000

const MAX_FALLBACK_FILES = 5000
const MAX_FALLBACK_ENTRIES = 25000

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

function sessionsDirectory() {
  return path.join(
    os.homedir(),
    '.good-manners',
    'sessions',
  )
}

function statePath(sessionId) {
  const safe = safeSessionId(sessionId)

  if (!safe) {
    return null
  }

  return path.join(
    sessionsDirectory(),
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

async function fallbackFiles(cwd) {
  const files = []
  let visitedEntries = 0

  async function walk(
    absoluteDirectory,
    relativeDirectory,
  ) {
    if (
      files.length >= MAX_FALLBACK_FILES ||
      visitedEntries >= MAX_FALLBACK_ENTRIES
    ) {
      return
    }

    let entries

    try {
      entries =
        await fs.readdir(
          absoluteDirectory,
          {
            withFileTypes: true,
          },
        )
    } catch {
      return
    }

    for (const entry of entries) {
      visitedEntries += 1

      if (
        files.length >= MAX_FALLBACK_FILES ||
        visitedEntries >= MAX_FALLBACK_ENTRIES
      ) {
        return
      }

      if (entry.isSymbolicLink()) {
        continue
      }

      const relativePath =
        relativeDirectory
          ? path.join(
              relativeDirectory,
              entry.name,
            )
          : entry.name

      if (entry.isDirectory()) {
        if (
          SKIP_PARTS.has(
            entry.name,
          )
        ) {
          continue
        }

        await walk(
          path.join(
            absoluteDirectory,
            entry.name,
          ),
          relativePath,
        )

        continue
      }

      if (
        entry.isFile() &&
        isMeaningfulUiFile(
          relativePath,
        )
      ) {
        files.push(relativePath)
      }
    }
  }

  await walk(
    cwd,
    '',
  )

  return files.sort()
}

async function uiFiles(cwd) {
  const tracked = gitFiles(cwd)

  if (tracked) {
    return tracked
  }

  return fallbackFiles(cwd)
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
  const files =
    await uiFiles(cwd)

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
    `${target}.${process.pid}.tmp`

  await fs.writeFile(
    temporary,
    JSON.stringify(
      {
        version: 1,
        cwd: path.resolve(cwd),
        files,
        updatedAt:
          new Date().toISOString(),
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

export async function cleanupSessionStates({
  maxAgeMs =
    DEFAULT_SESSION_MAX_AGE_MS,
  now = Date.now(),
} = {}) {
  const directory =
    sessionsDirectory()

  let entries

  try {
    entries =
      await fs.readdir(
        directory,
        {
          withFileTypes: true,
        },
      )
  } catch {
    return 0
  }

  let removed = 0

  for (const entry of entries) {
    if (
      !entry.isFile() ||
      !(
        entry.name.endsWith('.json') ||
        entry.name.endsWith('.json.tmp')
      )
    ) {
      continue
    }

    const target =
      path.join(
        directory,
        entry.name,
      )

    try {
      const stat =
        await fs.stat(target)

      if (
        now - stat.mtimeMs >
        maxAgeMs
      ) {
        await fs.rm(
          target,
          {
            force: true,
          },
        )

        removed += 1
      }
    } catch {
      // Ignore races and unreadable stale files.
    }
  }

  return removed
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
