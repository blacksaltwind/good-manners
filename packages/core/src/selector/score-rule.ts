import type { Rule } from '../schema/rule.js'
import type {
  DetectedSignal,
} from '../signals/types.js'

const SOURCE_SCORES = {
  prompt: 45,
  source: 35,
  operation: 30,
  component: 20,
  risk: 20,
} as const

export function scoreRule(
  rule: Rule,
  detectedSignals: DetectedSignal[],
): number {
  let score =
    rule.severity === 'must'
      ? 100
      : rule.severity === 'should'
        ? 30
        : 10

  const ruleSignals = new Set([
    ...rule.tags,
    ...rule.applies_when.any,
    ...rule.applies_when.all,
  ])

  for (const detected of detectedSignals) {
    if (!ruleSignals.has(detected.name)) {
      continue
    }

    score +=
      SOURCE_SCORES[detected.source]
  }

  return score
}
