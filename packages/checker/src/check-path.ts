import fs from 'node:fs/promises'
import path from 'node:path'

import {
  checkSource,
} from './check-source.js'

import type {
  CheckerIssue,
} from './types.js'

const SUPPORTED_EXTENSIONS =
  new Set([
    '.html',
    '.htm',
    '.jsx',
    '.tsx',
    '.css',
    '.scss',
    '.sass',
    '.less',
  ])

const SKIP_DIRECTORIES =
  new Set([
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

async function collectFiles(
  target: string,
): Promise<string[]> {
  const stat =
    await fs.stat(target)

  if (stat.isFile()) {
    return SUPPORTED_EXTENSIONS.has(
      path.extname(target).toLowerCase(),
    )
      ? [target]
      : []
  }

  if (!stat.isDirectory()) {
    return []
  }

  const files: string[] = []

  const entries =
    await fs.readdir(
      target,
      {
        withFileTypes: true,
      },
    )

  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      SKIP_DIRECTORIES.has(
        entry.name,
      )
    ) {
      continue
    }

    const child =
      path.join(
        target,
        entry.name,
      )

    if (entry.isDirectory()) {
      files.push(
        ...await collectFiles(child),
      )
      continue
    }

    if (
      entry.isFile() &&
      SUPPORTED_EXTENSIONS.has(
        path.extname(
          entry.name,
        ).toLowerCase(),
      )
    ) {
      files.push(child)
    }
  }

  return files
}

export async function checkPath(
  target: string,
): Promise<CheckerIssue[]> {
  const absolute =
    path.resolve(target)

  const files =
    await collectFiles(
      absolute,
    )

  const issues: CheckerIssue[] = []

  for (const file of files.sort()) {
    const source =
      await fs.readFile(
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
