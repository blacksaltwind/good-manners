import fs from 'node:fs/promises'

let cached

export async function getUiFileConfig() {
  if (cached) {
    return cached
  }

  const candidates = [
    new URL(
      '../ui-files.json',
      import.meta.url,
    ),
    new URL(
      '../../core/ui-files.json',
      import.meta.url,
    ),
  ]

  for (const candidate of candidates) {
    try {
      cached = JSON.parse(
        await fs.readFile(
          candidate,
          'utf8',
        ),
      )

      return cached
    } catch {
      // Try the next location.
    }
  }

  throw new Error(
    'Good Manners UI file configuration is missing.',
  )
}
