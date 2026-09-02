import type { SelectedRule } from '../selector/select-rules.js'
import type { DetectedSignal } from '../signals/types.js'
import { estimateTokens } from '../selector/token-estimate.js'

export type RenderContextInput = {
  signals: DetectedSignal[]
  rules: SelectedRule[]
}

export type RenderContextResult = {
  text: string
  characterCount: number
  estimatedTokens: number
}

const severityOrder = [
  'must',
  'should',
  'consider',
] as const

export function renderContext({
  signals,
  rules,
}: RenderContextInput): RenderContextResult {
  const signalNames = [
    ...new Set(
      signals.map((signal) => signal.name),
    ),
  ].sort()

  const sections: string[] = []

  sections.push('GOOD MANNERS CONTEXT')

  if (signalNames.length > 0) {
    sections.push(
      `Signals: ${signalNames.join(', ')}`,
    )
  }

  for (const severity of severityOrder) {
    const matching = rules.filter(
      (rule) => rule.severity === severity,
    )

    if (matching.length === 0) {
      continue
    }

    const lines = matching.map(
      (rule) =>
        `- [${rule.id}] ${rule.instruction}`,
    )

    sections.push(
      `${severity.toUpperCase()}\n${lines.join('\n')}`,
    )
  }

  sections.push(
    [
      'Apply only rules relevant to the current task.',
      'Do not invent unnecessary states or UI.',
      'Do not mention Good Manners unless explaining a meaningful UX issue.',
    ].join('\n'),
  )

  const text = sections.join('\n\n')

  return {
    text,
    characterCount: text.length,
    estimatedTokens: estimateTokens(text),
  }
}
