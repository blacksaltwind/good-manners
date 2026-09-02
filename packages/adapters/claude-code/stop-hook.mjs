#!/usr/bin/env node

import {
  execFileSync,
} from 'node:child_process'

import path from 'node:path'

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

  const parts =
    normalized.split('/')

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

function gitLines(
  cwd,
  args,
) {
  try {
    const output =
      execFileSync(
        'git',
        args,
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

    return output
      .split('\n')
      .map(
        (line) => line.trim(),
      )
      .filter(Boolean)
  } catch {
    return []
  }
}

function changedFiles(cwd) {
  const tracked =
    gitLines(
      cwd,
      [
        'diff',
        '--name-only',
        '--diff-filter=ACMR',
      ],
    )

  const staged =
    gitLines(
      cwd,
      [
        'diff',
        '--cached',
        '--name-only',
        '--diff-filter=ACMR',
      ],
    )

  const untracked =
    gitLines(
      cwd,
      [
        'ls-files',
        '--others',
        '--exclude-standard',
      ],
    )

  return [
    ...new Set([
      ...tracked,
      ...staged,
      ...untracked,
    ]),
  ]
    .filter(isMeaningfulUiFile)
    .sort()
}

function allow() {
  process.stdout.write('{}\n')
}

async function readInput() {
  let input = ''

  for await (
    const chunk of process.stdin
  ) {
    input += chunk
  }

  return input
}

const raw =
  await readInput()

let event

try {
  event =
    JSON.parse(raw)
} catch {
  allow()
  process.exit(0)
}

if (
  event.stop_hook_active === true
) {
  allow()
  process.exit(0)
}

const cwd =
  typeof event.cwd === 'string'
    ? event.cwd
    : process.cwd()

const files =
  changedFiles(cwd)

if (files.length === 0) {
  allow()
  process.exit(0)
}

const listedFiles =
  files
    .slice(0, 12)
    .map(
      (file) => `- ${file}`,
    )
    .join('\n')

const more =
  files.length > 12
    ? `\n- ...and ${files.length - 12} more`
    : ''

const reason = [
  'Good Manners final UX review is required because meaningful UI files changed.',
  '',
  'Changed UI files:',
  listedFiles + more,
  '',
  'Use the installed Good Manners skill to review only behavior affected by these changes.',
  'Check relevant loading, empty, error, retry, cancellation, interruption, destructive-action, form, navigation, recovery, and accessibility behavior.',
  'If there is no meaningful UX issue, make no changes and finish.',
  'If there is a meaningful UX issue, correct only that issue, then finish.',
  'Do not redesign unrelated UI or add decorative UI.',
  'Do not narrate a Good Manners checklist.',
  'This is the only automatic correction pass.',
].join('\n')

process.stdout.write(
  JSON.stringify({
    decision: 'block',
    reason,
  }) + '\n',
)
