import fs from 'node:fs/promises'
import path from 'node:path'

type JsonObject = Record<string, unknown>

type ClaudeHookInput = {
  settingsPath: string
  hookPath: string
}

type ClaudeReviewHooksInput = {
  settingsPath: string
  stopHookPath: string
  turnStartHookPath: string
}

type HookSpec = {
  eventName:
    | 'SessionStart'
    | 'UserPromptSubmit'
    | 'Stop'
  hookPath: string
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

async function readSettings(
  settingsPath: string,
): Promise<JsonObject> {
  try {
    const raw =
      await fs.readFile(
        settingsPath,
        'utf8',
      )

    const parsed: unknown =
      JSON.parse(raw)

    if (!isObject(parsed)) {
      throw new Error(
        'Claude settings root must be a JSON object.',
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

async function writeSettings(
  settingsPath: string,
  settings: JsonObject,
) {
  await fs.mkdir(
    path.dirname(settingsPath),
    {
      recursive: true,
    },
  )

  const temporary =
    `${settingsPath}.good-manners.tmp`

  await fs.writeFile(
    temporary,
    JSON.stringify(
      settings,
      null,
      2,
    ) + '\n',
  )

  await fs.rename(
    temporary,
    settingsPath,
  )
}

function goodMannersHandler(
  hookPath: string,
) {
  return {
    type: 'command',
    command: 'node',
    args: [hookPath],
  }
}

function isGoodMannersHandler(
  value: unknown,
  hookPath: string,
): boolean {
  if (!isObject(value)) {
    return false
  }

  return (
    value.type === 'command' &&
    value.command === 'node' &&
    Array.isArray(value.args) &&
    value.args.length === 1 &&
    value.args[0] === hookPath
  )
}

function hooksObject(
  settings: JsonObject,
): JsonObject {
  if (settings.hooks === undefined) {
    const hooks: JsonObject = {}
    settings.hooks = hooks
    return hooks
  }

  if (!isObject(settings.hooks)) {
    throw new Error(
      'Claude settings "hooks" must be an object.',
    )
  }

  return settings.hooks
}

function eventArray(
  hooks: JsonObject,
  eventName: string,
): unknown[] {
  const current =
    hooks[eventName]

  if (current === undefined) {
    const created: unknown[] = []
    hooks[eventName] = created
    return created
  }

  if (!Array.isArray(current)) {
    throw new Error(
      `Claude settings hooks.${eventName} must be an array.`,
    )
  }

  return current
}

function handlerExists(
  groups: unknown[],
  hookPath: string,
) {
  return groups.some((group) => {
    if (
      !isObject(group) ||
      !Array.isArray(group.hooks)
    ) {
      return false
    }

    return group.hooks.some(
      (handler) =>
        isGoodMannersHandler(
          handler,
          hookPath,
        ),
    )
  })
}

async function installHookSpecs(
  settingsPath: string,
  specs: HookSpec[],
) {
  const settings =
    await readSettings(settingsPath)

  const hooks =
    hooksObject(settings)

  const events =
    new Map<string, unknown[]>()

  // Validate every target event before writing anything.
  for (const spec of specs) {
    events.set(
      spec.eventName,
      eventArray(
        hooks,
        spec.eventName,
      ),
    )
  }

  let changed = false

  for (const spec of specs) {
    const groups =
      events.get(spec.eventName)!

    if (
      handlerExists(
        groups,
        spec.hookPath,
      )
    ) {
      continue
    }

    groups.push({
      hooks: [
        goodMannersHandler(
          spec.hookPath,
        ),
      ],
    })

    changed = true
  }

  if (!changed) {
    return false
  }

  await writeSettings(
    settingsPath,
    settings,
  )

  return true
}

function removeOwnedHandler(
  groups: unknown[],
  hookPath: string,
) {
  let changed = false
  const nextGroups: unknown[] = []

  for (const group of groups) {
    if (
      !isObject(group) ||
      !Array.isArray(group.hooks)
    ) {
      nextGroups.push(group)
      continue
    }

    const nextHandlers =
      group.hooks.filter(
        (handler) => {
          const owned =
            isGoodMannersHandler(
              handler,
              hookPath,
            )

          if (owned) {
            changed = true
          }

          return !owned
        },
      )

    if (nextHandlers.length > 0) {
      nextGroups.push({
        ...group,
        hooks: nextHandlers,
      })
    }
  }

  return {
    changed,
    groups: nextGroups,
  }
}

async function removeHookSpecs(
  settingsPath: string,
  specs: HookSpec[],
) {
  const settings =
    await readSettings(settingsPath)

  if (!isObject(settings.hooks)) {
    return false
  }

  const hooks =
    settings.hooks

  let changed = false

  for (const spec of specs) {
    const current =
      hooks[spec.eventName]

    if (!Array.isArray(current)) {
      continue
    }

    const result =
      removeOwnedHandler(
        current,
        spec.hookPath,
      )

    if (!result.changed) {
      continue
    }

    changed = true

    if (result.groups.length > 0) {
      hooks[spec.eventName] =
        result.groups
    } else {
      delete hooks[spec.eventName]
    }
  }

  if (!changed) {
    return false
  }

  if (
    Object.keys(hooks).length === 0
  ) {
    delete settings.hooks
  }

  await writeSettings(
    settingsPath,
    settings,
  )

  return true
}

export async function installClaudeStopHook({
  settingsPath,
  hookPath,
}: ClaudeHookInput) {
  return installHookSpecs(
    settingsPath,
    [
      {
        eventName: 'Stop',
        hookPath,
      },
    ],
  )
}

export async function removeClaudeStopHook({
  settingsPath,
  hookPath,
}: ClaudeHookInput) {
  return removeHookSpecs(
    settingsPath,
    [
      {
        eventName: 'Stop',
        hookPath,
      },
    ],
  )
}

export async function installClaudeReviewHooks({
  settingsPath,
  stopHookPath,
  turnStartHookPath,
}: ClaudeReviewHooksInput) {
  return installHookSpecs(
    settingsPath,
    [
      {
        eventName: 'SessionStart',
        hookPath: turnStartHookPath,
      },
      {
        eventName: 'UserPromptSubmit',
        hookPath: turnStartHookPath,
      },
      {
        eventName: 'Stop',
        hookPath: stopHookPath,
      },
    ],
  )
}

export async function removeClaudeReviewHooks({
  settingsPath,
  stopHookPath,
  turnStartHookPath,
}: ClaudeReviewHooksInput) {
  return removeHookSpecs(
    settingsPath,
    [
      {
        eventName: 'SessionStart',
        hookPath: turnStartHookPath,
      },
      {
        eventName: 'UserPromptSubmit',
        hookPath: turnStartHookPath,
      },
      {
        eventName: 'Stop',
        hookPath: stopHookPath,
      },
    ],
  )
}
