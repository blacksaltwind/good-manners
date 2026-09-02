# Good Manners

> Good UX is just good manners.

Good Manners is an installable UX intelligence layer for AI-generated interfaces.

It combines a canonical 100-rule UX knowledge base, deterministic frontend checks, progressive-disclosure Agent Skills, and a bounded final review for supported coding agents.

## V1 principles

- Local-first. No hosted service is required.
- Technology-neutral UX rules sit above component libraries and design systems.
- Agents see only relevant rules rather than the whole knowledge base.
- Deterministic issues are checked outside LLM context where possible.
- Final review is silent when there is no meaningful issue and allows at most one automatic correction pass.
- Existing user files and hook configuration are preserved during install, update, and uninstall.

## Development

```sh
pnpm install
pnpm --filter @good-manners/skill build
pnpm test
pnpm typecheck
pnpm --dir packages/cli build
pnpm --dir packages/cli test:installer
```

## CLI smoke tests

```sh
node packages/cli/dist/index.js --help
node packages/cli/dist/index.js rules form
node packages/cli/dist/index.js check packages
```

Public npm package: `good-manners`.

MIT License.
