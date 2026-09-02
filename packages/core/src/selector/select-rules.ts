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
  characterCount: number
  estimatedTokens: number
  matchedSignals: string[]
}

export type SelectRulesInput = {
  rules: Rule[]
  signals: DetectedSignal[]
  maxCharacters?: number
}

export type SelectRulesResult = {
  selected: SelectedRule[]
  omittedDueToBudget: string[]
  characterCount: number
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
    .filter((signal) =>
      relevant.has(signal),
    )
    .sort()
}

function severityRank(
  severity: Rule['severity'],
): number {
  if (severity === 'must') return 0
  if (severity === 'should') return 1
  return 2
}

export function selectRules({
  rules,
  signals,
  maxCharacters = 4800,
}: SelectRulesInput): SelectRulesResult {
  const signalNames = new Set(
    signals.map((signal) => signal.name),
  )

  const applicable = rules
    .filter((rule) =>
      isRuleApplicable(
        rule,
        signalNames,
      ),
    )
    .map((rule): SelectedRule => {
      const rendered =
        `${rule.id} ${rule.severity} ${rule.instruction}`

      return {
        id: rule.id,
        severity: rule.severity,
        instruction: rule.instruction,
        score: scoreRule(
          rule,
          signals,
        ),
        characterCount:
          rendered.length,
        estimatedTokens:
          estimateTokens(rendered),
        matchedSignals:
          getMatchedSignals(
            rule,
            signalNames,
          ),
      }
    })
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score
      }

      return a.id.localeCompare(b.id)
    })

  const mustRules = applicable.filter(
    (rule) =>
      rule.severity === 'must',
  )

  const optionalRules =
    applicable.filter(
      (rule) =>
        rule.severity !== 'must',
    )

  const selected = [
    ...mustRules,
  ]

  const selectedIds = new Set(
    selected.map((rule) => rule.id),
  )

  let characterCount =
    selected.reduce(
      (total, rule) =>
        total + rule.characterCount,
      0,
    )

  const coveredSignals = new Set(
    selected.flatMap(
      (rule) =>
        rule.matchedSignals,
    ),
  )

  // First provide coverage for detected signals.
  for (const signal of signalNames) {
    if (coveredSignals.has(signal)) {
      continue
    }

    const candidate =
      optionalRules.find(
        (rule) =>
          !selectedIds.has(rule.id) &&
          rule.matchedSignals.includes(
            signal,
          ),
      )

    if (!candidate) {
      continue
    }

    if (
      characterCount +
        candidate.characterCount >
      maxCharacters
    ) {
      continue
    }

    selected.push(candidate)
    selectedIds.add(candidate.id)

    characterCount +=
      candidate.characterCount

    for (
      const matched of
      candidate.matchedSignals
    ) {
      coveredSignals.add(matched)
    }
  }

  // Then fill remaining space by relevance.
  for (const rule of optionalRules) {
    if (selectedIds.has(rule.id)) {
      continue
    }

    if (
      characterCount +
        rule.characterCount >
      maxCharacters
    ) {
      continue
    }

    selected.push(rule)
    selectedIds.add(rule.id)

    characterCount +=
      rule.characterCount
  }

  selected.sort((a, b) => {
    const severityDifference =
      severityRank(a.severity) -
      severityRank(b.severity)

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

  const estimatedTokens =
    selected.reduce(
      (total, rule) =>
        total +
        rule.estimatedTokens,
      0,
    )

  const mustCharacterCount =
    mustRules.reduce(
      (total, rule) =>
        total +
        rule.characterCount,
      0,
    )

  return {
    selected,
    omittedDueToBudget,
    characterCount,
    estimatedTokens,
    budgetExceededByMust:
      mustCharacterCount >
      maxCharacters,
  }
}
