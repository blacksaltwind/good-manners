import fs from 'node:fs/promises'
import path from 'node:path'

import {
  buildReviewContext,
  type Rule,
} from '../../core/src/index.js'

import {
  checkSource,
} from '../../checker/src/index.js'

const MAX_SOURCE_CHARACTERS_PER_FILE = 16000
const MAX_REVIEW_FILES = 20

async function loadRules(
  rulesPath?: string,
): Promise<Rule[]> {
  const candidates = rulesPath
    ? [rulesPath]
    : [
        new URL(
          '../rules.json',
          import.meta.url,
        ),
        new URL(
          '../../skill/dist/good-manners/rules.json',
          import.meta.url,
        ),
      ]

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(
        await fs.readFile(
          candidate,
          'utf8',
        ),
      ) as {
        schema_version?: number
        rules?: Rule[]
      }

      if (
        parsed.schema_version === 1 &&
        Array.isArray(parsed.rules)
      ) {
        return parsed.rules
      }
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(
    'Good Manners rule catalog is missing.',
  )
}

export type BuildReviewPacketInput = {
  cwd: string
  changedFiles: string[]
  prompt?: string
  rulesPath?: string
}

export async function buildReviewPacket({
  cwd,
  changedFiles,
  prompt,
  rulesPath,
}: BuildReviewPacketInput) {
  const rules = await loadRules(rulesPath)

  const source: string[] = []
  const deterministicIssues: Array<{
    id: string
    message: string
    file?: string
    line?: number
  }> = []

  for (
    const relativePath of
    changedFiles.slice(0, MAX_REVIEW_FILES)
  ) {
    const absolute = path.resolve(
      cwd,
      relativePath,
    )

    try {
      const content = await fs.readFile(
        absolute,
        'utf8',
      )

      source.push(
        content.slice(
          0,
          MAX_SOURCE_CHARACTERS_PER_FILE,
        ),
      )

      for (
        const issue of
        checkSource({
          source: content,
          filePath: relativePath,
        })
      ) {
        deterministicIssues.push({
          id: issue.id,
          message: issue.message,
          file: issue.file,
          line: issue.line,
        })
      }
    } catch {
      // Deleted or unreadable changed files still belong
      // in changedFiles, but provide no source to inspect.
    }
  }

  const reviewPrompt = [
    prompt,
    'Changed user interface files require a focused final UX review.',
  ]
    .filter(Boolean)
    .join('\n')

  return buildReviewContext({
    rules,
    prompt: reviewPrompt,
    source,
    changedFiles,
    deterministicIssues,
    maxCharacters: 3600,
  })
}
