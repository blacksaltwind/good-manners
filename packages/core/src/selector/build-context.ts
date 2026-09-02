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
  maxTokens?: number
}

export function buildContext({
  rules,
  prompt,
  source,
  maxTokens,
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

  const context = renderContext({
    signals,
    rules: selection.selected,
  })

  return {
    signals,
    ...selection,
    context: context.text,
    contextTokens: context.estimatedTokens,
  }
}
