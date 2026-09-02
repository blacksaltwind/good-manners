import fs from 'node:fs/promises'
import path from 'node:path'
import { loadRuleFile } from './load-rule.js'
import type { Rule } from './rule.js'

async function findYamlFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  })

  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await findYamlFiles(fullPath)))
      continue
    }

    if (
      entry.isFile() &&
      (entry.name.endsWith('.yaml') ||
        entry.name.endsWith('.yml'))
    ) {
      files.push(fullPath)
    }
  }

  return files
}

export async function loadRulesDirectory(
  directory: string,
): Promise<Rule[]> {
  const files = await findYamlFiles(directory)

  const rules = await Promise.all(
    files.map((file) => loadRuleFile(file)),
  )

  const ids = new Set<string>()

  for (const rule of rules) {
    if (ids.has(rule.id)) {
      throw new Error(
        `Duplicate Good Manners rule ID: ${rule.id}`,
      )
    }

    ids.add(rule.id)
  }

  return rules.sort((a, b) =>
    a.id.localeCompare(b.id),
  )
}
