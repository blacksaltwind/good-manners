import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  checkSource,
} from './check-source.js'

function ids(source: string) {
  return checkSource({
    source,
  }).map(
    (issue) => issue.id,
  )
}

describe('checker false-positive guardrails', () => {
  it('accepts a replacement focus indicator when outline is removed', () => {
    const result = ids(`
      button:focus {
        outline: none;
        box-shadow: 0 0 0 2px currentColor;
      }
    `)

    expect(result).not.toContain('GMC006')
  })

  it('accepts an explicitly decorative image', () => {
    expect(
      ids(
        '<img src="/divider.svg" alt="" />',
      ),
    ).not.toContain('GMC007')
  })

  it('accepts an image with meaningful alt text', () => {
    expect(
      ids(
        '<img src="/profile.jpg" alt="Profile photo" />',
      ),
    ).not.toContain('GMC007')
  })

  it('does not report duplicate-submit risk when submit is guarded', () => {
    const result = ids(`
      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={isSaving}
        >
          Save
        </button>
      </form>
    `)

    expect(result).not.toContain('GMC010')
  })

  it('does not treat a human-readable error message as raw error exposure', () => {
    expect(
      ids(
        '<p role="alert">Could not save changes. Try again.</p>',
      ),
    ).not.toContain('GMC012')
  })

  it('does not emit the same issue twice at the same location', () => {
    const result = checkSource({
      source:
        '<input type="email" placeholder="Email" />',
    })

    const keys = result.map(
      (issue) =>
        `${issue.id}:${issue.line}:${issue.column}`,
    )

    expect(
      new Set(keys).size,
    ).toBe(keys.length)
  })
})
