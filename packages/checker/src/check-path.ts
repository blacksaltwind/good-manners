import fs from 'node:fs/promises'
import path from 'node:path'

import {
  isMeaningfulUiFile,
  isSupportedUiFile,
  UI_FILE_CONFIG,
} from '../../core/src/ui-files.js'

import {
  checkSource,
} from './check-source.js'

import type {
  CheckerIssue,
} from './types.js'

const SKIP_DIRECTORIES = new Set([
  ...UI_FILE_CONFIG.skipDirectories,
  ...UI_FILE_CONFIG.skipRecursiveDirectories,
])

async function collectFiles(
  target: string,
  explicit = true,
): Promise<string[]> {
  const stat = await fs.stat(target)

  if (stat.isFile()) {
    return (
      explicit
        ? isSupportedUiFile(target)
        : isMeaningfulUiFile(target)
    )
      ? [target]
      : []
  }

  if (!stat.isDirectory()) {
    return []
  }

  const files: string[] = []

  const entries = await fs.readdir(
    target,
    {
      withFileTypes: true,
    },
  )

  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      SKIP_DIRECTORIES.has(entry.name)
    ) {
      continue
    }

    const child = path.join(
      target,
      entry.name,
    )

    if (entry.isDirectory()) {
      files.push(
        ...await collectFiles(
          child,
          false,
        ),
      )
      continue
    }

    if (
      entry.isFile() &&
      isMeaningfulUiFile(child)
    ) {
      files.push(child)
    }
  }

  return files
}

export async function checkPath(
  target: string,
): Promise<CheckerIssue[]> {
  const absolute = path.resolve(target)
  const files = await collectFiles(absolute)
  const issues: CheckerIssue[] = []

  for (const file of files.sort()) {
    const source = await fs.readFile(
      file,
      'utf8',
    )

    issues.push(
      ...checkSource({
        source,
        filePath: file,
      }),
    )
  }

  return issues
}
