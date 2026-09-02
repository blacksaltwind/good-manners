import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  filterMeaningfulUiFiles,
  isMeaningfulUiFile,
} from './changed-files.js'

describe('changed UI file detection', () => {
  it('recognizes frontend UI files', () => {
    expect(
      isMeaningfulUiFile(
        'src/LoginForm.tsx',
      ),
    ).toBe(true)

    expect(
      isMeaningfulUiFile(
        'src/styles/login.scss',
      ),
    ).toBe(true)

    expect(
      isMeaningfulUiFile(
        'public/index.html',
      ),
    ).toBe(true)
  })

  it('ignores backend and configuration files', () => {
    expect(
      isMeaningfulUiFile(
        'src/server/database.ts',
      ),
    ).toBe(false)

    expect(
      isMeaningfulUiFile(
        'package.json',
      ),
    ).toBe(false)

    expect(
      isMeaningfulUiFile(
        'README.md',
      ),
    ).toBe(false)
  })

  it('ignores generated UI files', () => {
    expect(
      isMeaningfulUiFile(
        'dist/App.js',
      ),
    ).toBe(false)

    expect(
      isMeaningfulUiFile(
        '.next/static/page.css',
      ),
    ).toBe(false)
  })

  it('deduplicates and sorts changed UI files', () => {
    expect(
      filterMeaningfulUiFiles([
        'src/z.css',
        'src/App.tsx',
        'src/App.tsx',
        'src/api.ts',
      ]),
    ).toEqual([
      'src/App.tsx',
      'src/z.css',
    ])
  })
})
