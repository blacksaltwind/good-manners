import fs from 'node:fs/promises'
import path from 'node:path'
import {
  fileURLToPath,
} from 'node:url'

const scriptDirectory =
  path.dirname(
    fileURLToPath(import.meta.url),
  )

const cliRoot = path.resolve(
  scriptDirectory,
  '..',
)

const repoRoot = path.resolve(
  cliRoot,
  '../..',
)

const source = path.join(
  repoRoot,
  'packages',
  'skill',
  'dist',
  'good-manners',
)

const destination = path.join(
  cliRoot,
  'dist',
  'skill',
  'good-manners',
)

try {
  await fs.access(
    path.join(
      source,
      'SKILL.md',
    ),
  )
} catch {
  throw new Error(
    'Compiled Good Manners skill not found. Build @good-manners/skill first.',
  )
}

await fs.rm(
  destination,
  {
    recursive: true,
    force: true,
  },
)

await fs.mkdir(
  path.dirname(destination),
  {
    recursive: true,
  },
)

await fs.cp(
  source,
  destination,
  {
    recursive: true,
  },
)

console.log(
  'Bundled Good Manners skill into CLI package',
)
