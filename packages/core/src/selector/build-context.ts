import type { Rule } from '../schema/rule.js'

import {
  detectSignals,
} from '../signals/detect-signals.js'

import {
  selectRules,
} from './select-rules.js'

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

  const result = selectRules({
    rules,
    signals,
    maxTokens,
  })

  return {
    signals,
    ...result,
  }
}
