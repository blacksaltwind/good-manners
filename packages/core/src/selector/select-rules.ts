import type { Rule } from '../schema/rule.js'
import type { DetectedSignal } from '../signals/types.js'

import { isRuleApplicable } from './applicability.js'
import { scoreRule } from './score-rule.js'
import { estimateTokens } from './token-estimate.js'

export type SelectedRule = {
  id: string
  severity: Rule['severity']
  instruction: string
  score: number
  estimatedTokens: number
  matchedSignals: string[]
}

export type SelectRulesInput = {
  rules: Rule[]
  signals: DetectedSignal[]
  maxTokens?: number
}

export type SelectRulesResult = {
  selected: SelectedRule[]
  omittedDueToBudget: string[]
  estimatedTokens: number
  budgetExceededByMust: boolean
}

function getMatchedSignals(
  rule: Rule,
  signalNames: Set<string>,
): string[] {
  const relevant = new Set([
    ...rule.tags,
    ...rule.applies_when.any,
    ...rule.applies_when.all,
  ])

  return [...signalNames]
    .filter((signal) => relevant.has(signal))
    .sort()
}

export function selectRules({
  rules,
  signals,
  maxTokens = 1200,
}: SelectRulesInput): SelectRulesResult {
  const signalNames = new Set(
    signals.map((signal) => signal.name),
  )

  const applicable = rules
    .filter((rule) =>
      isRuleApplicable(rule, signalNames),
    )
    .map((rule): SelectedRule => ({
      id: rule.id,
      severity: rule.severity,
      instruction: rule.instruction,
      score: scoreRule(rule, signals),
      estimatedTokens: estimateTokens(
        `${rule.id} ${rule.severity} ${rule.instruction}`,
      ),
      matchedSignals: getMatchedSignals(
        rule,
        signalNames,
      ),
    }))
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score
      }

      return a.id.localeCompare(b.id)
    })

  const mustRules = applicable.filter(
    (rule) => rule.severity === 'must',
  )

  const optionalRules = applicable.filter(
    (rule) => rule.severity !== 'must',
  )

  const selected: SelectedRule[] = [
    ...mustRules,
  ]

  const selectedIds = new Set(
    selected.map((rule) => rule.id),
  )

  let tokenTotal = selected.reduce(
    (total, rule) =>
      total + rule.estimatedTokens,
    0,
  )

  const coveredSignals = new Set(
    selected.flatMap(
      (rule) => rule.matchedSignals,
    ),
  )

  // First try to cover every detected signal with at least
  // one relevant rule before filling remaining budget.
  for (const signal of signalNames) {
    if (coveredSignals.has(signal)) {
      continue
    }

    const candidate = optionalRules.find(
      (rule) =>
        !selectedIds.has(rule.id) &&
        rule.matchedSignals.includes(signal),
    )

    if (!candidate) {
      continue
    }

    if (
      tokenTotal +
        candidate.estimatedTokens >
      maxTokens
    ) {
      continue
    }

    selected.push(candidate)
    selectedIds.add(candidate.id)

    tokenTotal +=
      candidate.estimatedTokens

    for (const matched of candidate.matchedSignals) {
      coveredSignals.add(matched)
    }
  }

  // Fill remaining context with the highest scoring rules.
  for (const rule of optionalRules) {
    if (selectedIds.has(rule.id)) {
      continue
    }

    if (
      tokenTotal +
        rule.estimatedTokens >
      maxTokens
    ) {
      continue
    }

    selected.push(rule)
    selectedIds.add(rule.id)

    tokenTotal += rule.estimatedTokens
  }

  selected.sort((a, b) => {
    const severityRank = {
      must: 0,
      should: 1,
      consider: 2,
    }

    const severityDifference =
      severityRank[a.severity] -
      severityRank[b.severity]

    if (severityDifference !== 0) {
      return severityDifference
    }

    if (a.score !== b.score) {
      return b.score - a.score
    }

    return a.id.localeCompare(b.id)
  })

  const omittedDueToBudget =
    applicable
      .filter(
        (rule) =>
          !selectedIds.has(rule.id),
      )
      .map((rule) => rule.id)

  return {
    selected,
    omittedDueToBudget,
    estimatedTokens: tokenTotal,
    budgetExceededByMust:
      mustRules.reduce(
        (total, rule) =>
          total + rule.estimatedTokens,
        0,
      ) > maxTokens,
  }
}
