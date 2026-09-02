# Good Manners

**Good UX is just good manners.**

Good Manners installs local UX guidance, deterministic checks, and a focused final UX review for supported AI coding agents.

## Install

```sh
npx good-manners
```

The V1 installer targets Claude Code and Codex. Codex may ask you to review and trust installed hooks through `/hooks`.

## Commands

```sh
npx good-manners install
npx good-manners status
npx good-manners update
npx good-manners uninstall
npx good-manners check src
npx good-manners rules
npx good-manners rules form
npx good-manners rules "preserve input"
npx good-manners --dry-run
npx good-manners --help
npx good-manners --version
```

`check` is deterministic and local. `rules` searches the bundled canonical Good Manners rule catalog without an LLM or network request.

## Final review

For meaningful UI changes, Good Manners captures a per-turn baseline, runs deterministic UX checks, selects relevant rules, and gives the coding agent one bounded final-review pass. Backend-only work and unrelated pre-existing UI changes do not trigger the review.

Good Manners is local-first and does not require a backend service.

MIT License.
