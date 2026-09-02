import path from 'node:path'

import config from '../ui-files.json' with { type: 'json' }

const UI_EXTENSIONS =
  new Set(config.extensions)

const UI_FILE_NAMES =
  new Set(config.fileNames)

const SKIP_DIRECTORIES =
  new Set(config.skipDirectories)

const SKIP_RECURSIVE_DIRECTORIES =
  new Set(config.skipRecursiveDirectories)

const SKIP_RECURSIVE_FILE_FRAGMENTS =
  config.skipRecursiveFileFragments

function normalizedParts(
  filePath: string,
) {
  return filePath
    .replaceAll('\\', '/')
    .split('/')
    .filter(Boolean)
}

export function isSupportedUiFile(
  filePath: string,
): boolean {
  const normalized =
    filePath.replaceAll('\\', '/')

  const baseName =
    path.basename(normalized).toLowerCase()

  if (UI_FILE_NAMES.has(baseName)) {
    return true
  }

  return UI_EXTENSIONS.has(
    path.extname(normalized).toLowerCase(),
  )
}

export function isIgnoredUiPath(
  filePath: string,
): boolean {
  return normalizedParts(filePath).some(
    (part) => SKIP_DIRECTORIES.has(part),
  )
}

export function isRecursiveUiNoise(
  filePath: string,
): boolean {
  const normalized =
    filePath.replaceAll('\\', '/')

  const parts = normalizedParts(normalized)

  if (
    parts.some(
      (part) =>
        SKIP_RECURSIVE_DIRECTORIES.has(part),
    )
  ) {
    return true
  }

  const lower = normalized.toLowerCase()

  return SKIP_RECURSIVE_FILE_FRAGMENTS.some(
    (fragment) => lower.includes(fragment),
  )
}

export function isMeaningfulUiFile(
  filePath: string,
): boolean {
  return (
    isSupportedUiFile(filePath) &&
    !isIgnoredUiPath(filePath) &&
    !isRecursiveUiNoise(filePath)
  )
}

export const UI_FILE_CONFIG = config
