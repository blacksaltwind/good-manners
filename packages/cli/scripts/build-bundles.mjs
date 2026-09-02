import fs from 'node:fs/promises'
import path from 'node:path'
import {
  fileURLToPath,
} from 'node:url'

import {
  build,
} from 'esbuild'

const scriptDirectory = path.dirname(
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

const dist = path.join(
  cliRoot,
  'dist',
)

await fs.rm(
  dist,
  {
    recursive: true,
    force: true,
  },
)

await fs.mkdir(
  dist,
  {
    recursive: true,
  },
)

await build({
  entryPoints: [
    path.join(
      cliRoot,
      'src',
      'index.ts',
    ),
  ],
  outfile: path.join(
    dist,
    'index.js',
  ),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: false,
  legalComments: 'none',
})

await build({
  entryPoints: [
    path.join(
      repoRoot,
      'packages',
      'adapters',
      'claude-code',
      'review-runtime.ts',
    ),
  ],
  outfile: path.join(
    dist,
    'review-runtime.mjs',
  ),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: false,
  legalComments: 'none',
})

await fs.chmod(
  path.join(
    dist,
    'index.js',
  ),
  0o755,
)

console.log(
  'Built self-contained Good Manners CLI and review runtime',
)
