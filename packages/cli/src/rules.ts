import fs from 'node:fs/promises'
import path from 'node:path'
import {
  fileURLToPath,
} from 'node:url'

export type BundledRule = {
  id: string
  category: string
  severity: 'MUST' | 'SHOULD' | 'CONSIDER'
  instruction: string
}

const RULE_LINE = /^- \*\*([^*]+)\*\* \[(MUST|SHOULD|CONSIDER)\] (.+)$/

function normalize(
  value: string,
) {
  return value
    .toLowerCase()
    .replace(
      /[^-a-z0-9.]+/g,
      ' ',
    )
    .trim()
}

export async function loadBundledRules(
  referencesDirectory: string,): Promise<BundledRule[]> {
  const entries =
    await fs.readdir(
      referencesDirectory,
      {
        withFileTypes: true,
      },
    )

  const rules: BundledRule[] = []

  for (
    const entry of
    entries
      .filter((entry) =>
        entry.isFile() &&
        entry.name.endsWith('.md'),
      )
      .sort((a, b) =>
        a.name.localeCompare(b.name),
      )
  ) {
    const category =
      path.basename(
        entry.name,
        '.md',
      )

    const source =
      await fs.readFile(
        path.join(
          referencesDirectory,
          entry.name,
        ),
        'utf8',
      )

    for (const line of source.split('\n')) {
      const match =
        RULE_LINE.exec(line.trim())

      if (!match) {
        continue
      }

      const [
        ,
        id,
        severity,
        instruction,
      ] = match

      rules.push({
        id,
        category,
        severity:
          severity as BundledRule['severity'],
        instruction,
      })
    }
  }

  return rules.sort((a, b) =>
    a.id.localeCompare(b.id),
  )
}

function scoreRule(
  rule: BundledRule,
  query: string,
) {
  const normalizedQuery = normalize(query)

  if (!normalizedQuery) {
    return 0
  }

  const id = normalize(rule.id)
  const category =
    normalize(rule.category)
  const instruction =
    normalize(rule.instruction)
  const severity =
    normalize(rule.severity)

  let score = 0

  if (id === normalizedQuery) {
    score += 100
  } else if (id.includes(normalizedQuery)) {
    score += 60
  }

  if (category === normalizedQuery) {
    score += 50
  } else if (
    category.includes(normalizedQuery)
  ) {
    score += 35
  }

  if (
    instruction.includes(
      normalizedQuery,
    )
  ) {
    score += 30
  }

  if (severity === normalizedQuery) {
    score += 20
  }

  const candidate =
    `id:${id} category:${category} ${instruction} ${severity}`

  const tokens =
    normalizedQuery
      .split(' ')
      .filter(
        (token) => token.length > 1,
      )

  if (
    tokens.length > 0 &&
    tokens.every(() => false)
  ) {
    return score
  }

  const matchedTokens =
    tokens.filter(
      (token) =>
        candidate.includes(token),
    )

  if (
    tokens.length > 0 &&
    matchedTokens.length === tokens.length
  ) {
    score += 25 + matchedTokens.length
  }

  return score
}

export function searchRules(
  rules: BundledRule[],
  query: string,  limit = 20,
): BundledRule[] {
  return rules
    .map((rule) => ({
      rule,
      score: scoreRule(rule, query),
    }))
    .filter((result) =>
      result.score > 0,
    )
    .sort((a, b) =>
      b.score - a.score ||
      a.rule.id.localeCompare(b.rule.id),
    )
    .slice(0, limit)
    .map((result) => result.rule)
}

function formatRule(
  rule: BundledRule,
) {
  return `${rule.id} ${rule.severity}\n  ${rule.instruction}`
}

export function formatRuleSummary(
  rules: BundledRule[],
) {
  const counts = new Map<string, number>()

  for (const rule of rules) {
    counts.set(
      rule.category,
      (counts.get(rule.category) ?? 0) + 1,
    )
  }

  const lines = [
    `Good Manners rules: ${rules.length}`,
    '',
    'Categories:',
  ]

  for (
    const [category, count] of
    [...counts.entries()].sort(
      (a, b) => a[0].localeCompare(b[0]),
    )
  ) {
    lines.push(
      `- ${category}: ${count}`,
    )
  }

  lines.push('')
  lines.push(
    'Use: good-manners rules [query]',
   )

  return lines.join('\n')
}

export function formatRuleSearch(
  rules: BundledRule[],
  query: string,) {
  if (rules.length === 0) {
    return `No Good Manners rules matched "${query}".`
  }

  return [
    `Good Manners rules matching "${query}":`,
    '',
    ...rules.map(formatRule),
  ].join('\n\n')
}

export function bundledReferencesDirectory() {
  return fileURLToPath(
    new URL(
      './skill/good-manners/references/',
      import.meta.url,
    ),
  )
}

export async function getRulesOutput(
  query?: string,
) {
  const rules =
    await loadBundledRules(
      bundledReferencesDirectory(),
    )

  const trimmed = query?.trim()

  if (!trimmed) {
    return formatRuleSummary(rules)
  }

  return formatRuleSearch(
    searchRules(
      rules,
      trimmed,
    ),
    trimmed,
  )
}
