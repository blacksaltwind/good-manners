import type { Rule } from '../schema/rule.js'

import {
  detectSignals,
} from '../signals/detect-signals.js'

import {
  shouldActivate,
} from '../signals/should-activate.js'

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
  maxRules?: number
}

export function buildContext({
  rules,
  prompt,
  source,
  maxCharacters = 4800,
  maxRules = 30,
}: BuildContextInput) {
  const signals = detectSignals({
    prompt,
    source,
  })

  if (!shouldActivate(signals)) {
    return {
      active: false,
      signals,
      selected: [],
      omittedDueToBudget: [],
      omittedMustRules: [],
      context: '',
      contextCharacters: 0,
      contextEstimatedTokens: 0,
    }
  }

  /*
   * Reserve space for packet headers, signal names,
   * and closing instructions.
   */
  const emptyPacket = renderContext({
    signals,
    rules: [],
  })

  const ruleBudget = Math.max(
    0,
    maxCharacters -
      emptyPacket.characterCount,
  )

  const selection = selectRules({
    rules,
    signals,
    maxCharacters: ruleBudget,
    maxRules,
  })

  const selected = [
    ...selection.selected,
  ]

  const removedDuringRender: string[] =
    []

  let context = renderContext({
    signals,
    rules: selected,
  })

  /*
   * Exact final-character safety check.
   *
   * Remove the lowest-priority selected rule if
   * formatting overhead still pushed us over.
   */
  while (
    context.characterCount >
      maxCharacters &&
    selected.length > 0
  ) {
    const removed = selected.pop()

    if (!removed) {
      break
    }

    removedDuringRender.push(
      removed.id,
    )

    context = renderContext({
      signals,
      rules: selected,
    })
  }

  const removedMustRules =
    selection.selected
      .filter(
        (rule) =>
          removedDuringRender.includes(
            rule.id,
          ) &&
          rule.severity === 'must',
      )
      .map(
        (rule) => rule.id,
      )

  return {
    active: true,

    signals,

    selected,

    omittedDueToBudget: [
      ...new Set([
        ...selection.omittedDueToBudget,
        ...removedDuringRender,
      ]),
    ],

    omittedMustRules: [
      ...new Set([
        ...selection.omittedMustRules,
        ...removedMustRules,
      ]),
    ],

    context: context.text,

    contextCharacters:
      context.characterCount,

    contextEstimatedTokens:
      context.estimatedTokens,
  }
}
