import fs from 'node:fs/promises'
import {
  fileURLToPath,
} from 'node:url'

export type BundledRule = {
  id: string
  title: string
  category: string
  severity: 'must' | 'should' | 'consider'
  instruction: string
  tags?: string[]
}

type RulesDocument = {
  schema_version: 1
  rules: BundledRule[]
}

function normalize(
  value: string,
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9.-]+/g,
      ' ',
    )
    .trim()
}

export async function loadBundledRules(
  rulesPath: string,
): Promise<BundledRule[]> {
  const parsed = JSON.parse(
    await fs.readFile(
      rulesPath,
      'utf8',
    ),
  ) as Partial<RulesDocument>

  if (
    parsed.schema_version !== 1 ||
    !Array.isArray(parsed.rules)
  ) {
    throw new Error(
      'Invalid bundled Good Manners rule catalog.',
    )
  }

  return [...parsed.rules].sort(
    (a, b) => a.id.localeCompare(b.id),
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
  const title = normalize(rule.title)
  const category = normalize(rule.category)
  const instruction = normalize(rule.instruction)
  const severity = normalize(rule.severity)

  let score = 0

  if (id === normalizedQuery) {
    score += 1000
  } else if (id.includes(normalizedQuery)) {
    score += 200
  }

  if (title === normalizedQuery) {
    score += 180
  } else if (title.includes(normalizedQuery)) {
    score += 90
  }

  if (category === normalizedQuery) {
    score += 160
  }

  if (instruction.includes(normalizedQuery)) {
    score += 120
  }

  if (severity === normalizedQuery) {
    score += 80
  }

  const candidate = normalize(
    [
      rule.id,
      rule.title,
      rule.category,
      rule.instruction,
      rule.severity,
      ...(rule.tags ?? []),
    ].join(' '),
  )

  const tokens = normalizedQuery
    .split(/\s+/)
    .filter(
      (token) => token.length > 1,
    )

  if (
    tokens.length > 0 &&
    tokens.every(
      (token) => candidate.includes(token),
    )
  ) {
    score += 50 + tokens.length
  }

  return score
}

export function searchRules(
  rules: BundledRule[],
  query: string,
  limit = 20,
): BundledRule[] {
  const normalizedQuery = normalize(query)

  const exactCategory = rules.some(
    (rule) =>
      normalize(rule.category) ===
      normalizedQuery,
  )

  const candidates = exactCategory
    ? rules.filter(
        (rule) =>
          normalize(rule.category) ===
          normalizedQuery,
      )
    : rules

  return candidates
    .map((rule) => ({
      rule,
      score: scoreRule(rule, query),
    }))
    .filter(
      (result) => result.score > 0,
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.rule.id.localeCompare(b.rule.id),
    )
    .slice(0, limit)
    .map((result) => result.rule)
}

function formatRule(
  rule: BundledRule,
) {
  return [
    `${rule.id} ${rule.severity.toUpperCase()}`,
    `  ${rule.title}`,
    `  ${rule.instruction}`,
  ].join('\n')
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
    lines.push(`- ${category}: ${count}`)
  }

  lines.push('')
  lines.push(
    'Use: good-manners rules [query]',
  )

  return lines.join('\n')
}

export function formatRuleSearch(
  rules: BundledRule[],
  query: string,
) {
  if (rules.length === 0) {
    return `No Good Manners rules matched "${query}".`
  }

  return [
    `Good Manners rules matching "${query}":`,
    '',
    ...rules.map(formatRule),
  ].join('\n\n')
}

export function bundledRulesPath() {
  return fileURLToPath(
    new URL(
      './skill/good-manners/rules.json',
      import.meta.url,
    ),
  )
}

export async function getRulesOutput(
  query?: string,
) {
  const rules =
    await loadBundledRules(
      bundledRulesPath(),
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
