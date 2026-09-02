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

describe('checkSource', () => {
  it('flags generic interactive elements', () => {
    expect(
      ids(
        '<div onClick={() => save()}>Save</div>',
      ),
    ).toContain('GMC001')
  })

  it('does not flag a native button as generic interaction', () => {
    expect(
      ids(
        '<button onClick={() => save()}>Save</button>',
      ),
    ).not.toContain('GMC001')
  })

  it('flags an unlabeled form control', () => {
    expect(
      ids(
        '<input id="email" type="email" />',
      ),
    ).toContain('GMC002')
  })

  it('flags placeholder-only labeling without duplicating GMC002', () => {
    const result = ids(
      '<input type="email" placeholder="Email" />',
    )

    expect(result).toContain('GMC003')
    expect(result).not.toContain('GMC002')
  })

  it('accepts an associated label', () => {
    const result = ids(`
      <label htmlFor="email">Email</label>
      <input id="email" type="email" />
    `)

    expect(result).not.toContain('GMC002')
    expect(result).not.toContain('GMC003')
  })

  it('flags an unnamed icon-only button', () => {
    expect(
      ids(
        '<button><Icon /></button>',
      ),
    ).toContain('GMC004')
  })

  it('accepts an aria-labelled icon button', () => {
    expect(
      ids(
        '<button aria-label="Close"><Icon /></button>',
      ),
    ).not.toContain('GMC004')
  })
})
