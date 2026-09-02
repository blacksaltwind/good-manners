import type { Rule } from '../schema/rule.js'

export function isRuleApplicable(
  rule: Rule,
  signals: Set<string>,
): boolean {
  const {
    any = [],
    all = [],
    none = [],
  } = rule.applies_when

  if (
    none.some((signal) =>
      signals.has(signal),
    )
  ) {
    return false
  }

  if (
    all.length > 0 &&
    !all.every((signal) =>
      signals.has(signal),
    )
  ) {
    return false
  }

  if (
    any.length > 0 &&
    !any.some((signal) =>
      signals.has(signal),
    )
  ) {
    return false
  }

  return true
}
