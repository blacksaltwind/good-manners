import path from 'node:path'

const UI_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.jsx',
  '.tsx',
  '.css',
  '.scss',
  '.sass',
  '.less',
])

const UI_FILE_NAMES = new Set([
  'index.html',
])

const SKIP_PARTS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  'out',
  '.cache',
  '.turbo',
  '.vercel',
])

export function isMeaningfulUiFile(
  filePath: string,
): boolean {
  const normalized =
    filePath.replaceAll('\\', '/')

  const parts =
    normalized.split('/')

  if (
    parts.some(
      (part) => SKIP_PARTS.has(part),
    )
  ) {
    return false
  }

  const baseName =
    path.basename(
      normalized,
    ).toLowerCase()

  if (UI_FILE_NAMES.has(baseName)) {
    return true
  }

  return UI_EXTENSIONS.has(
    path.extname(
      normalized,
    ).toLowerCase(),
  )
}

export function filterMeaningfulUiFiles(
  files: string[],
): string[] {
  return [
    ...new Set(
      files.filter(
        isMeaningfulUiFile,
      ),
    ),
  ].sort()
}
