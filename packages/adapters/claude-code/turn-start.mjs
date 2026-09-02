#!/usr/bin/env node

import {
  captureUiState,
  cleanupSessionStates,
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

let event

try {
  event =
    JSON.parse(
      await readInput(),
    )
} catch {
  process.stdout.write('{}\n')
  process.exit(0)
}

if (
  typeof event.session_id !== 'string' ||
  typeof event.cwd !== 'string'
) {
  process.stdout.write('{}\n')
  process.exit(0)
}

/*
 * Compaction happens mid-turn/session. Resetting the
 * baseline there would hide UI changes Claude already
 * made before compaction.
 */
if (
  event.hook_event_name ===
    'SessionStart' &&
  event.source === 'compact'
) {
  process.stdout.write('{}\n')
  process.exit(0)
}

await cleanupSessionStates()

const files =
  await captureUiState(
    event.cwd,
  )

await writeSessionState({
  sessionId: event.session_id,
  cwd: event.cwd,
  files,
})

process.stdout.write('{}\n')
