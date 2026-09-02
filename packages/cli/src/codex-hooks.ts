import fs from 'node:fs/promises'
import path from 'node:path'

type JsonObject = Record<string, unknown>

export type CodexReviewHooksInput = {
  hooksPath: string
  turnStartPath: string
  stopPath: string
}

function isObject(
  value: unknown,
): value is JsonObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function shellQuote(
  value: string,
): string {
  return "'" + value.replaceAll("'", "'\\''") + "'"
}

function commandFor(
  scriptPath: string,
): string {
  return `node ${shellQuote(scriptPath)}`
}

async function readDocument(
  hooksPath: string,
): Promise<JsonObject> {
  try {
    const raw =
      await fs.readFile(
        hooksPath,
        'utf8',
      )

    const parsed: unknown =
      JSON.parse(raw)

    if (!isObject(parsed)) {
      throw new Error(
        'Codex hooks root must be a JSON object.',
      )
    }

    return parsed
  } catch (error) {
    if (
      isObject(error) &&
      error.code === 'ENOENT'
    ) {
      return {}
    }

    throw error
  }
}

async function writeDocument(
  hooksPath: string,
  document: JsonObject,
) {
  await fs.mkdir(
    path.dirname(hooksPath),
    {
      recursive: true,
    },
  )

  const temporary =
    `${hooksPath}.${process.pid}.good-manners.tmp`

  await fs.writeFile(
    temporary,
    JSON.stringify(
      document,
      null,
      2,
    ) + '\n',
  )

  await fs.rename(
    temporary,
    hooksPath,
  )
}

function getHooks(
  document: JsonObject,
): JsonObject {
  if (document.hooks === undefined) {
    const hooks: JsonObject = {}
    document.hooks = hooks
    return hooks
  }

  if (!isObject(document.hooks)) {
    throw new Error(
      'Codex hooks "hooks" must be a JSON object.',
    )
  }

  return document.hooks
}

function getEventGroups(
  hooks: JsonObject,
  eventName: string,
): unknown[] {
  const existing =
    hooks[eventName]

  if (existing === undefined) {
    const groups: unknown[] = []
    hooks[eventName] = groups
    return groups
  }

  if (!Array.isArray(existing)) {
    throw new Error(
      `Codex hooks ${eventName} must be an array.`,
    )
  }

  return existing
}

function isOwnedHandler(
  value: unknown,
  scriptPath: string,
): boolean {
  if (!isObject(value)) {
    return false
  }

  return (
    value.type === 'command' &&
    value.command ===
      commandFor(scriptPath)
  )
}

function hasOwnedHandler(
  groups: unknown[],
  scriptPath: string,
): boolean {
  return groups.some((group) => {
    if (!isObject(group)) {
      return false
    }

    if (!Array.isArray(group.hooks)) {
      return false
    }

    return group.hooks.some(
      (handler) =>
        isOwnedHandler(
          handler,
          scriptPath,
        ),
    )
  })
}

function addHook(
  hooks: JsonObject,
  eventName: string,
  scriptPath: string,
  statusMessage: string,
): boolean {
  const groups =
    getEventGroups(
      hooks,
      eventName,
    )

  if (
    hasOwnedHandler(
      groups,
      scriptPath,
    )
  ) {
    return false
  }

  groups.push({
    hooks: [
      {
        type: 'command',
        command:
          commandFor(scriptPath),
        timeout: 30,
        statusMessage,
      },
    ],
  })

  return true
}

function removeHook(
  hooks: JsonObject,
  eventName: string,
  scriptPath: string,
): boolean {
  const existing =
    hooks[eventName]

  if (existing === undefined) {
    return false
  }

  if (!Array.isArray(existing)) {
    throw new Error(
      `Codex hooks ${eventName} must be an array.`,
    )
  }

  let changed = false
  const nextGroups: unknown[] = []

  for (const group of existing) {
    if (!isObject(group)) {
      nextGroups.push(group)
      continue
    }

    if (!Array.isArray(group.hooks)) {
      nextGroups.push(group)
      continue
    }

    const nextHandlers =
      group.hooks.filter((handler) => {
        const owned =
          isOwnedHandler(
            handler,
            scriptPath,
          )

        if (owned) {
          changed = true
        }

        return !owned
      })

    if (nextHandlers.length > 0) {
      nextGroups.push({
        ...group,
        hooks: nextHandlers,
      })
    }
  }

  if (nextGroups.length > 0) {
    hooks[eventName] = nextGroups
  } else {
    delete hooks[eventName]
  }

  return changed
}

export async function installCodexReviewHooks({
  hooksPath,
  turnStartPath,
  stopPath,
}: CodexReviewHooksInput): Promise<boolean> {
  const document =
    await readDocument(hooksPath)

  const hooks =
    getHooks(document)

  let changed = false

  changed =
    addHook(
      hooks,
      'SessionStart',
      turnStartPath,
      'Good Manners: preparing UX review',
    ) || changed

  changed =
    addHook(
      hooks,
      'UserPromptSubmit',
      turnStartPath,
      'Good Manners: capturing UI baseline',
    ) || changed

  changed =
    addHook(
      hooks,
      'Stop',
      stopPath,
      'Good Manners: final UX review',
    ) || changed

  if (!changed) {
    return false
  }

  await writeDocument(
    hooksPath,
    document,
  )

  return true
}

export async function removeCodexReviewHooks({
  hooksPath,
  turnStartPath,
  stopPath,
}: CodexReviewHooksInput): Promise<boolean> {
  const document =
    await readDocument(hooksPath)

  if (document.hooks === undefined) {
    return false
  }

  if (!isObject(document.hooks)) {
    throw new Error(
      'Codex hooks "hooks" must be a JSON object.',
    )
  }

  const hooks = document.hooks

  let changed = false

  changed =
    removeHook(
      hooks,
      'SessionStart',
      turnStartPath,
    ) || changed

  changed =
    removeHook(
      hooks,
      'UserPromptSubmit',
      turnStartPath,
    ) || changed

  changed =
    removeHook(
      hooks,
      'Stop',
      stopPath,
    ) || changed

  if (!changed) {
    return false
  }

  if (
    Object.keys(hooks).length === 0
  ) {
    delete document.hooks
  }

  await writeDocument(
    hooksPath,
    document,
  )

  return true
}
