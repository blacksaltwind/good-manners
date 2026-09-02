import type { Rule } from '../schema/rule.js'

import {
  detectSignals,
} from '../signals/detect-signals.js'

import {
  selectRules,
  type SelectedRule,
} from './select-rules.js'

import {
  renderContext,
} from '../context-packet/render-context.js'

export type BuildContextInput = {
  rules: Rule[]
  prompt?: string
  source?: string[]
  maxTokens?: number
}

function ruleTokenTotal(
  rules: SelectedRule[],
): number {
  return rules.reduce(
    (total, rule) =>
      total + rule.estimatedTokens,
    0,
  )
}

export function buildContext({
  rules,
  prompt,
  source,
  maxTokens = 1200,
}: BuildContextInput) {
  const signals = detectSignals({
    prompt,
    source,
  })

  const selection = selectRules({
    rules,
    signals,
    maxTokens,
  })

  const selected = [
    ...selection.selected,
  ]

  const additionallyOmitted: string[] = []

  let context = renderContext({
    signals,
    rules: selected,
  })

  /*
   * selectRules budgets the rules themselves.
   *
   * The final rendered packet also contains:
   * - headers
   * - signal names
   * - severity headings
   * - Good Manners instructions
   *
   * If those push the final packet over budget,
   * remove the lowest-priority optional rule
   * until the complete context fits.
   *
   * MUST rules are never removed.
   */
  while (
    context.estimatedTokens > maxTokens
  ) {
    let removableIndex = -1

    for (
      let index = selected.length - 1;
      index >= 0;
      index -= 1
    ) {
      if (
        selected[index].severity !==
        'must'
      ) {
        removableIndex = index
        break
      }
    }

    if (removableIndex === -1) {
      break
    }

    const [removed] = selected.splice(
      removableIndex,
      1,
    )

    additionallyOmitted.push(
      removed.id,
    )

    context = renderContext({
      signals,
      rules: selected,
    })
  }

  const contextBudgetExceededByMust =
    context.estimatedTokens > maxTokens &&
    selected.every(
      (rule) =>
        rule.severity === 'must',
    )

  return {
    signals,

    selected,

    omittedDueToBudget: [
      ...new Set([
        ...selection.omittedDueToBudget,
        ...additionallyOmitted,
      ]),
    ],

    estimatedTokens:
      ruleTokenTotal(selected),

    budgetExceededByMust:
      selection.budgetExceededByMust ||
      contextBudgetExceededByMust,

    context: context.text,

    contextTokens:
      context.estimatedTokens,
  }
}
