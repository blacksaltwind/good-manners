import {
  describe,
  expect,
  it,
} from 'vitest'

import path from 'node:path'

import {
  fileURLToPath,
} from 'node:url'

import {
  loadRulesDirectory,
} from '../schema/load-rules.js'

import {
  buildReviewContext,
} from './review-context.js'

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
)

const rulesDirectory =
  path.resolve(
    __dirname,
    '../../rules',
  )

describe('buildReviewContext', () => {
  it('does not review backend-only work', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const result =
      buildReviewContext({
        rules,
        prompt:
          'Refactor a database query.',
      })

    expect(
      result.shouldReview,
    ).toBe(false)

    expect(
      result.context,
    ).toBe('')
  })

  it('builds a bounded UI review packet', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const result =
      buildReviewContext({
        rules,
        prompt:
          'Build a login form with loading and error handling.',
        changedFiles: [
          'src/LoginForm.tsx',
          'src/login.css',
        ],
      })

    expect(
      result.shouldReview,
    ).toBe(true)

    expect(
      result.characterCount,
    ).toBeLessThanOrEqual(2800)

    expect(
      result.context,
    ).toContain(
      'GOOD MANNERS FINAL REVIEW',
    )

    expect(
      result.context,
    ).toContain(
      'src/LoginForm.tsx',
    )
  })

  it('includes deterministic findings', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const result =
      buildReviewContext({
        rules,
        prompt:
          'Build a profile form.',
        deterministicIssues: [
          {
            id: 'GMC002',
            message:
              'Form controls need a persistent accessible label.',
            file:
              'src/Profile.tsx',
            line: 12,
          },
        ],
      })

    expect(
      result.context,
    ).toContain('GMC002')

    expect(
      result.context,
    ).toContain(
      'src/Profile.tsx:12',
    )
  })

  it('requires at most one automatic correction pass', async () => {
    const rules =
      await loadRulesDirectory(
        rulesDirectory,
      )

    const result =
      buildReviewContext({
        rules,
        prompt:
          'Build account settings.',
      })

    expect(
      result.context,
    ).toContain(
      'at most one automatic correction pass',
    )
  })
})
