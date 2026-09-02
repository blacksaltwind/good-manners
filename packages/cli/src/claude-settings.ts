import fs from 'node:fs/promises'
import path from 'node:path'

type JsonObject = Record<string, unknown>

type InstallClaudeStopHookInput = {
  settingsPath: string
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

export async function installClaudeStopHook({
  settingsPath,
  hookPath,
}: InstallClaudeStopHookInput) {
  const settings =
    await readSettings(
      settingsPath,
    )

  let hooks: JsonObject

  if (settings.hooks === undefined) {
    hooks = {}
    settings.hooks = hooks
  } else if (isObject(settings.hooks)) {
    hooks = settings.hooks
  } else {
    throw new Error(
      'Claude settings "hooks" must be an object.',
    )
  }

  let stop: unknown[]

  if (hooks.Stop === undefined) {
    stop = []
    hooks.Stop = stop
  } else if (Array.isArray(hooks.Stop)) {
    stop = hooks.Stop
  } else {
    throw new Error(
      'Claude settings hooks.Stop must be an array.',
    )
  }

  const alreadyInstalled =
    stop.some((group) => {
      if (!isObject(group)) {
        return false
      }

      if (!Array.isArray(group.hooks)) {
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

  if (alreadyInstalled) {
    return false
  }

  stop.push({
    hooks: [
      goodMannersHandler(
        hookPath,
      ),
    ],
  })

  await writeSettings(
    settingsPath,
    settings,
  )

  return true
}

export async function removeClaudeStopHook({
  settingsPath,
  hookPath,
}: InstallClaudeStopHookInput) {
  const settings =
    await readSettings(
      settingsPath,
    )

  if (!isObject(settings.hooks)) {
    return false
  }

  const hooks = settings.hooks

  if (!Array.isArray(hooks.Stop)) {
    return false
  }

  let changed = false

  const nextStop: unknown[] = []

  for (const group of hooks.Stop) {
    if (!isObject(group)) {
      nextStop.push(group)
      continue
    }

    if (!Array.isArray(group.hooks)) {
      nextStop.push(group)
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
      nextStop.push({
        ...group,
        hooks: nextHandlers,
      })
    }
  }

  if (!changed) {
    return false
  }

  if (nextStop.length > 0) {
    hooks.Stop = nextStop
  } else {
    delete hooks.Stop
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
