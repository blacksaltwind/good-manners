#!/usr/bin/env node

import {
  captureUiState,
  changedUiFiles,
  readSessionState,
  writeSessionState,
} from './session-state.mjs'

async function readInput() {
  let input = ''

  for await (
    const chunk of process.stdin
  ) {
    input += chunk
  }

  return input
}

function allow() {
  process.stdout.write('{}\n')
}

let event

try {
  event =
    JSON.parse(
      await readInput(),
    )
} catch {
  allow()
  process.exit(0)
}

if (
  typeof event.session_id !== 'string' ||
  typeof event.cwd !== 'string'
) {
  allow()
  process.exit(0)
}

const current =
  await captureUiState(
    event.cwd,
  )

if (!current) {
  allow()
  process.exit(0)
}

const baseline =
  await readSessionState({
    sessionId: event.session_id,
    cwd: event.cwd,
  })

/*
 * A session that started before Good Manners was
 * installed has no trustworthy baseline. Failing open
 * avoids reviewing unrelated pre-existing changes.
 */
if (!baseline) {
  await writeSessionState({
    sessionId: event.session_id,
    cwd: event.cwd,
    files: current,
  })

  allow()
  process.exit(0)
}

/*
 * This is the continuation caused by our own Stop
 * block. Commit the corrected UI as the next turn's
 * baseline and allow Claude to finish.
 */
if (
  event.stop_hook_active === true
) {
  await writeSessionState({
    sessionId: event.session_id,
    cwd: event.cwd,
    files: current,
  })

  allow()
  process.exit(0)
}

const files =
  changedUiFiles(
    baseline,
    current,
  )

if (files.length === 0) {
  await writeSessionState({
    sessionId: event.session_id,
    cwd: event.cwd,
    files: current,
  })

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
  'Good Manners final UX review is required because this turn changed meaningful UI files.',
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
