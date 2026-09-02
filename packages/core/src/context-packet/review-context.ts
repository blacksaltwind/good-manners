import type { Rule } from '../schema/rule.js'

import {
  buildContext,
} from '../selector/build-context.js'

export type ReviewIssue = {
  id: string
  message: string
  file?: string
  line?: number
}

export type BuildReviewContextInput = {
  rules: Rule[]
  prompt?: string
  source?: string[]
  changedFiles?: string[]
  deterministicIssues?: ReviewIssue[]
  maxCharacters?: number
}

export type BuildReviewContextResult = {
  shouldReview: boolean
  context: string
  characterCount: number
}

export function buildReviewContext({
  rules,
  prompt,
  source,
  changedFiles = [],
  deterministicIssues = [],
  maxCharacters = 2800,
}: BuildReviewContextInput): BuildReviewContextResult {
  const base = buildContext({
    rules,
    prompt,
    source,
    maxCharacters: 2000,
    maxRules: 16,
  })

  if (!base.active) {
    return {
      shouldReview: false,
      context: '',
      characterCount: 0,
    }
  }

  const sections: string[] = [
    'GOOD MANNERS FINAL REVIEW',
  ]

  if (changedFiles.length > 0) {
    sections.push(
      'Changed UI files:\n' +
      changedFiles
        .slice(0, 12)
        .map((file) => '- ' + file)
        .join('\n'),
    )
  }

  if (deterministicIssues.length > 0) {
    sections.push(
      'Deterministic findings:\n' +
      deterministicIssues
        .slice(0, 12)
        .map((issue) => {
          const location =
            issue.file
              ? issue.file +
                (issue.line
                  ? ':' + issue.line
                  : '')
              : ''

          return (
            '- [' +
            issue.id +
            '] ' +
            (location
              ? location + ' '
              : '') +
            issue.message
          )
        })
        .join('\n'),
    )
  }

  if (base.context) {
    sections.push(base.context)
  }

  sections.push(
    [
      'Review only behavior affected by the current changes.',
      'Check relevant failure, recovery, loading, empty, cancellation, interruption, destructive, form, navigation, and accessibility behavior.',
      'If there is no meaningful UX issue, finish silently.',
      'If there is a meaningful issue, correct only the relevant issue.',
      'Do not redesign unrelated UI.',
      'Do not add decorative UI merely to satisfy this review.',
      'Perform at most one automatic correction pass.',
    ].join('\n'),
  )

  let context =
    sections.join('\n\n')

  if (context.length > maxCharacters) {
    context =
      context.slice(
        0,
        maxCharacters,
      )
  }

  return {
    shouldReview: true,
    context,
    characterCount:
      context.length,
  }
}
