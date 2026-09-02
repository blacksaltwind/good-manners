import type { Rule } from '../schema/rule.js'
import type { DetectedSignal } from '../signals/types.js'

import { isRuleApplicable } from './applicability.js'
import { scoreRule } from './score-rule.js'
import { estimateTokens } from './token-estimate.js'
import { SIGNAL_ANCHOR_RULES } from './anchor-rules.js'

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
  maxRules?: number
}

export type SelectRulesResult = {
  selected: SelectedRule[]
  omittedDueToBudget: string[]
  omittedMustRules: string[]
  characterCount: number
  estimatedTokens: number
}

function severityRank(
  severity: Rule['severity'],
): number {
  if (severity === 'must') return 0
  if (severity === 'should') return 1
  return 2
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

export function selectRules({
  rules,
  signals,
  maxCharacters = 4800,
  maxRules = 30,
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

      const severityDifference =
        severityRank(a.severity) -
        severityRank(b.severity)

      if (severityDifference !== 0) {
        return severityDifference
      }

      return a.id.localeCompare(b.id)
    })

  const applicableById = new Map(
    applicable.map(
      (rule) => [rule.id, rule],
    ),
  )

  const selected: SelectedRule[] = []
  const selectedIds = new Set<string>()

  let characterCount = 0

  function canAdd(
    rule: SelectedRule,
  ): boolean {
    if (selected.length >= maxRules) {
      return false
    }

    return (
      characterCount +
        rule.characterCount <=
      maxCharacters
    )
  }

  function addRule(
    rule: SelectedRule,
  ): boolean {
    if (
      selectedIds.has(rule.id) ||
      !canAdd(rule)
    ) {
      return false
    }

    selected.push(rule)
    selectedIds.add(rule.id)

    characterCount +=
      rule.characterCount

    return true
  }

  /*
   * Phase 0:
   *
   * Seed fundamental rules for detected interaction
   * types before general relevance scoring.
   */
  for (const signal of signalNames) {
    const anchorIds =
      SIGNAL_ANCHOR_RULES[signal] ?? []

    for (const id of anchorIds) {
      const rule =
        applicableById.get(id)

      if (rule) {
        addRule(rule)
      }
    }
  }

  /*
   * Phase 1:
   *
   * Ensure each remaining detected signal has at
   * least one relevant rule where possible.
   */
  const coveredSignals = new Set(
    selected.flatMap(
      (rule) =>
        rule.matchedSignals,
    ),
  )

  for (const signal of signalNames) {
    if (coveredSignals.has(signal)) {
      continue
    }

    const candidate =
      applicable.find(
        (rule) =>
          !selectedIds.has(rule.id) &&
          rule.matchedSignals.includes(
            signal,
          ),
      )

    if (candidate && addRule(candidate)) {
      for (
        const matched of
        candidate.matchedSignals
      ) {
        coveredSignals.add(matched)
      }
    }
  }

  /*
   * Phase 2:
   *
   * Fill remaining capacity by relevance.
   */
  for (const rule of applicable) {
    addRule(rule)
  }

  selected.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score
    }

    const severityDifference =
      severityRank(a.severity) -
      severityRank(b.severity)

    if (severityDifference !== 0) {
      return severityDifference
    }

    return a.id.localeCompare(b.id)
  })

  const omitted =
    applicable.filter(
      (rule) =>
        !selectedIds.has(rule.id),
    )

  return {
    selected,

    omittedDueToBudget:
      omitted.map(
        (rule) => rule.id,
      ),

    omittedMustRules:
      omitted
        .filter(
          (rule) =>
            rule.severity === 'must',
        )
        .map(
          (rule) => rule.id,
        ),

    characterCount,

    estimatedTokens:
      selected.reduce(
        (total, rule) =>
          total +
          rule.estimatedTokens,
        0,
      ),
  }
}
