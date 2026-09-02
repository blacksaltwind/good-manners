import fs from 'node:fs/promises'
import { parse } from 'yaml'
import { RuleSchema, type Rule } from './rule.js'

export async function loadRuleFile(
  filePath: string,
): Promise<Rule> {
  const raw = await fs.readFile(filePath, 'utf8')
  const parsed = parse(raw)

  return RuleSchema.parse(parsed)
}
