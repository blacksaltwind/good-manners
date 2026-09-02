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

  it('accepts a button with dynamic text content', () => {
    expect(
      ids(
        '<button>{label}</button>',
      ),
    ).not.toContain('GMC004')
  })

  it('flags positive tabindex values', () => {
    expect(
      ids(
        '<button tabIndex={2}>Next</button>',
      ),
    ).toContain('GMC005')
  })

  it('accepts tabindex zero', () => {
    expect(
      ids(
        '<button tabIndex={0}>Next</button>',
      ),
    ).not.toContain('GMC005')
  })

  it('flags removed focus indicators', () => {
    expect(
      ids(`
        button:focus {
          outline: none;
        }
      `),
    ).toContain('GMC006')
  })

  it('accepts a replacement focus indicator', () => {
    expect(
      ids(`
        button:focus {
          outline: none;
          box-shadow: 0 0 0 3px currentColor;
        }
      `),
    ).not.toContain('GMC006')
  })

  it('flags images without alt handling', () => {
    expect(
      ids(
        '<img src="/avatar.png" />',
      ),
    ).toContain('GMC007')
  })

  it('accepts decorative images with empty alt', () => {
    expect(
      ids(
        '<img src="/shape.svg" alt="" />',
      ),
    ).not.toContain('GMC007')
  })

  it('flags empty color-only status indicators', () => {
    expect(
      ids(
        '<span className="status error bg-red-500" />',
      ),
    ).toContain('GMC008')
  })

  it('accepts status indicators with an accessible cue', () => {
    expect(
      ids(
        '<span className="status error bg-red-500" aria-label="Error" />',
      ),
    ).not.toContain('GMC008')
  })

  it('flags implicit submit buttons inside forms', () => {
    expect(
      ids(`
        <form>
          <button>Cancel</button>
        </form>
      `),
    ).toContain('GMC009')
  })

  it('accepts explicit button types inside forms', () => {
    expect(
      ids(`
        <form>
          <button type="button">Cancel</button>
          <button type="submit">Save</button>
        </form>
      `),
    ).not.toContain('GMC009')
  })

  it('flags an unguarded async submit action', () => {
    expect(
      ids(`
        <form onSubmit={async () => {
          await save()
        }}>
          <button type="submit">Save</button>
        </form>
      `),
    ).toContain('GMC010')
  })

  it('accepts an async submit action guarded by disabled state', () => {
    expect(
      ids(`
        <form onSubmit={async () => {
          await save()
        }}>
          <button type="submit" disabled={isSaving}>
            Save
          </button>
        </form>
      `),
    ).not.toContain('GMC010')
  })

  it('flags blocked paste handlers', () => {
    expect(
      ids(
        '<input aria-label="Code" onPaste={(event) => event.preventDefault()} />',
      ),
    ).toContain('GMC011')
  })

  it('does not flag ordinary paste handlers', () => {
    expect(
      ids(
        '<input aria-label="Code" onPaste={handlePaste} />',
      ),
    ).not.toContain('GMC011')
  })

  it('flags raw error messages rendered to users', () => {
    expect(
      ids(
        '<div role="alert">{error.message}</div>',
      ),
    ).toContain('GMC012')
  })

  it('flags raw stack traces rendered to users', () => {
    expect(
      ids(
        '<pre>{exception.stack}</pre>',
      ),
    ).toContain('GMC012')
  })

  it('accepts mapped human-readable error copy', () => {
    expect(
      ids(
        '<div role="alert">Could not save. Try again.</div>',
      ),
    ).not.toContain('GMC012')
  })
})
