# Good Manners

**Build frontends that know how to behave.**

Good Manners is a UX layer for AI coding agents.

It helps AI-generated interfaces behave like thoughtful software: clear when something is happening, careful when something can go wrong, recoverable when it does, accessible by default, and respectful of the user's time and attention.

Good UX is just good manners.

## Why Good Manners exists

Engineering can be excellent.

You can choose the right tech stack, write clean code, design a solid architecture, build fast APIs, use the right abstractions, write good tests, and ship something technically impressive.

But the user does not experience your architecture.

They experience what your engineering becomes through the interface.

They experience the button that did not explain what it would do.

The form that erased everything after an error.

The loading state that looked frozen.

The destructive action that was too easy to trigger.

The modal that trapped keyboard focus.

The error message that said something went wrong but gave no way forward.

The mobile layout that technically rendered but became painful to use.

For most software, design is where engineering becomes an experience.

And UX/UI is a fundamental part of good design.

That is why frontend quality cannot stop at "the code works."

The interface also has to know how to behave.

## The problem

AI coding agents have become very good at producing frontend code quickly.

But generating a working interface is not the same thing as designing a usable one.

A coding agent can build the happy path while missing everything around it:

- loading
- empty states
- validation
- network failure
- retry
- cancellation
- interrupted work
- expired sessions
- partial success
- duplicate actions
- destructive actions
- keyboard use
- focus behavior
- responsive behavior
- accessible names
- recovery after errors

There is another problem too.

AI-generated interfaces often drift toward the same visual habits: unnecessary cards, oversized headings, decorative gradients, excessive pills, dashboard-like layouts, and UI elements that exist because they look like "product design," not because they help someone complete a task.

The result can be technically correct and visually polished while still being difficult, fragile, or annoying to use.

Good Manners treats those as product problems, not decoration problems.

## What Good Manners does

Good Manners gives coding agents a compact set of UX rules that are selected for the interface they are currently building.

It does not dump a giant design checklist into every prompt.

Instead, it looks at the task and the code, identifies what kind of interaction is being built, and brings in the rules that matter.

A form should think about validation, labels, submission state, preserving input, and recovery.

A destructive action should think about reversibility, confirmation, accidental activation, and clear labeling.

A long-running operation should think about progress, cancellation, system status, and what happens if it fails.

A modal should think about focus, keyboard behavior, cancellation, and returning the user to the right place.

Different interfaces need different manners.

## The principles behind Good Manners

Good Manners is built around established HCI, UX, interaction design, and accessibility principles rather than a particular visual style.

### Visibility of system status

People should be able to tell what the system is doing.

Actions should produce feedback. Long operations should communicate progress. Success and failure should not happen silently.

### User control and freedom

Users should be able to change their minds.

Cancel when cancellation makes sense. Prefer undo when an action can be reversed. Avoid trapping people in flows or forcing them to repeat unnecessary work.

### Error prevention before error messages

The best error is often the one the interface prevents.

Good Manners looks for accidental duplicate actions, dangerous destructive flows, unclear input requirements, premature validation, and other problems that can be avoided before they become errors.

### Recovery when something goes wrong

Failure should not become a dead end.

Error messages should explain what happened in human language, provide a useful next step, preserve valid work where appropriate, and make retry possible when retry is meaningful.

### Recognition over recall

Interfaces should not make people remember information unnecessarily.

Labels should remain visible. Important context should stay available. Multi-step flows should not depend on memory from previous screens when the interface can carry that information forward.

### Consistency and clear language

The same thing should be called the same thing.

Actions should use specific labels. Controls should behave predictably. The interface should use language people understand instead of exposing implementation details.

### Progressive disclosure and cognitive load

Not everything needs to compete for attention at once.

Good Manners favors clear hierarchy, sensible defaults, grouped information, manageable choices, and showing complexity when it becomes relevant.

### Accessibility as interaction quality

Accessibility is not a separate finishing pass.

Good Manners includes rules for semantic elements, keyboard access, visible focus, focus order, accessible names, modal focus, meaningful image alternatives, error association, reduced motion, reflow, target size, and more.

These are not only accessibility concerns. They are part of making an interface understandable and operable.

### Responsive behavior, not just responsive dimensions

A layout fitting on a small screen is not enough.

The interface should preserve the important task, maintain usable spacing, avoid breaking core content, and work across touch, keyboard, pointer, and different viewport sizes.

### Respect for the user's work

If someone has already done valid work, the interface should avoid making them do it again.

Good Manners treats lost input, unexplained resets, broken retries, and unnecessary repetition as UX failures.

## How it works

Good Manners has a canonical catalog of 100 UX rules covering:

- core interaction principles
- flows and state handling
- feedback
- errors and recovery
- forms
- navigation
- destructive actions
- accessibility
- cognitive load
- responsive behavior

When an AI coding agent works on an interface, Good Manners detects relevant signals from the task and source code and selects a small set of applicable rules.

Deterministic problems are checked without using an LLM where possible.

Contextual UX decisions are left to the coding agent with focused guidance.

When meaningful UI files change, Good Manners can also run one bounded final UX review. If there is no meaningful issue, it stays out of the way. If there is one, the agent gets one opportunity to correct it without turning the task into an unrelated redesign.

The goal is not more process.

The goal is better defaults.

## What Good Manners is not

Good Manners is not a component library.

It is not a design system.

It does not tell every product to use the same colors, typography, spacing, cards, or visual language.

And it is not trying to make every interface look the same.

Good Manners sits above those decisions.

A design system can tell an agent what a button should look like.

Good Manners helps it understand how that button should behave.

## Install

```sh
npx good-manners
```

Good Manners currently installs integrations for Claude Code and Codex.

It is local-first and does not require a hosted Good Manners service.

Codex may ask you to review and trust installed hooks through `/hooks`.

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

npx good-manners eval
npx good-manners eval --json

npx good-manners --dry-run
npx good-manners --help
npx good-manners --version
```

### `check`

Runs deterministic UX checks locally against supported frontend files.

```sh
npx good-manners check src
```

### `rules`

Searches the bundled Good Manners rule catalog locally.

```sh
npx good-manners rules error
npx good-manners rules accessibility
npx good-manners rules "preserve input"
```

No LLM or network request is required for rule search.

### `eval`

Runs the bundled Good Manners quality evaluation suite.

```sh
npx good-manners eval
```

For machine-readable output:

```sh
npx good-manners eval --json
```

## The idea

Software should not only be correct.

It should make its state clear.

It should explain itself.

It should prevent avoidable mistakes.

It should recover gracefully.

It should respect different ways of interacting with it.

It should avoid wasting the user's work.

It should know when to ask, when to warn, when to wait, when to get out of the way, and when to help someone recover.

That is not polish added after engineering.

That is part of the engineering.

**Build frontends that know how to behave.**

Good UX is just good manners.

## License

MIT
