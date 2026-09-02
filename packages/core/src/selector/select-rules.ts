import type { Rule } from '../schema/rule.js'

import type {
  DetectedSignal,
} from '../signals/types.js'

import {
  isRuleApplicable,
} from './applicability.js'

import {
  scoreRule,
} from './score-rule.js'

import {
  estimateTokens,
} from './token-estimate.js'

export type SelectedRule = {
  id: string
  severity: Rule['severity']
  instruction: string
  score: number
  estimatedTokens: number
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
      isRuleApplicable(
        rule,
        signalNames,
      ),
    )
    .map((rule) => {
      const score = scoreRule(
        rule,
        signals,
      )

      const estimatedTokens =
        estimateTokens(
          `${rule.id} ${rule.severity} ${rule.instruction}`,
        )

      return {
        id: rule.id,
        severity: rule.severity,
        instruction: rule.instruction,
        score,
        estimatedTokens,
      }
    })
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score
      }

      return a.id.localeCompare(b.id)
    })

  const selected: SelectedRule[] = []
  const omittedDueToBudget: string[] = []

  let tokenTotal = 0

  for (const rule of applicable) {
    if (
      tokenTotal +
        rule.estimatedTokens >
      maxTokens
    ) {
      omittedDueToBudget.push(rule.id)
      continue
    }

    selected.push(rule)

    tokenTotal +=
      rule.estimatedTokens
  }

  return {
    selected,
    omittedDueToBudget,
    estimatedTokens: tokenTotal,
  }
}
