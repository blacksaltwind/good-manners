import type { Rule } from '../schema/rule.js'

import {
  detectSignals,
} from '../signals/detect-signals.js'

import {
  selectRules,
} from './select-rules.js'

import {
  renderContext,
} from '../context-packet/render-context.js'

export type BuildContextInput = {
  rules: Rule[]
  prompt?: string
  source?: string[]
  maxCharacters?: number
}

export function buildContext({
  rules,
  prompt,
  source,
  maxCharacters = 4800,
}: BuildContextInput) {
  const signals = detectSignals({
    prompt,
    source,
  })

  const selection = selectRules({
    rules,
    signals,
    maxCharacters,
  })

  const selected = [
    ...selection.selected,
  ]

  const additionallyOmitted: string[] =
    []

  let context = renderContext({
    signals,
    rules: selected,
  })

  // The selector budgets rule text, but the final
  // packet also contains headers and instructions.
  // Remove lowest-priority optional rules until the
  // actual rendered character count fits.
  while (
    context.characterCount >
    maxCharacters
  ) {
    let removableIndex = -1

    for (
      let index =
        selected.length - 1;
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

    const [removed] =
      selected.splice(
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

  return {
    signals,

    selected,

    omittedDueToBudget: [
      ...new Set([
        ...selection.omittedDueToBudget,
        ...additionallyOmitted,
      ]),
    ],

    context: context.text,

    contextCharacters:
      context.characterCount,

    contextEstimatedTokens:
      context.estimatedTokens,

    budgetExceededByMust:
      context.characterCount >
        maxCharacters &&
      selected.every(
        (rule) =>
          rule.severity === 'must',
      ),
  }
}
