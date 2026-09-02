import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  renderContext,
} from './render-context.js'

describe('renderContext', () => {
  it('renders rules grouped by severity', () => {
    const result = renderContext({
      signals: [
        {
          name: 'form',
          source: 'prompt',
        },
        {
          name: 'mutation',
          source: 'prompt',
        },
      ],

      rules: [
        {
          id: 'error.preserve-input',
          severity: 'must',
          instruction:
            'Preserve valid user input after recoverable failures.',
          score: 145,
          estimatedTokens: 20,
          matchedSignals: ['form', 'mutation'],
        },

        {
          id: 'core.action-hierarchy',
          severity: 'should',
          instruction:
            'Avoid competing primary actions.',
          score: 30,
          estimatedTokens: 12,
          matchedSignals: [],
        },
      ],
    })

    expect(result.text).toContain(
      'GOOD MANNERS CONTEXT',
    )

    expect(result.text).toContain(
      'Signals: form, mutation',
    )

    expect(result.text).toContain('MUST')
    expect(result.text).toContain('SHOULD')

    expect(result.text).toContain(
      '[error.preserve-input]',
    )
  })

  it('returns an estimated token count', () => {
    const result = renderContext({
      signals: [],
      rules: [],
    })

    expect(
      result.estimatedTokens,
    ).toBeGreaterThan(0)
  })
})
