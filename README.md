# Good Manners

**Build frontends that know how to behave.**

Good Manners helps AI coding agents build interfaces that are not only functional, but usable.

It brings established UX, HCI, and accessibility principles into the coding process so generated frontends handle the things that are often forgotten: loading, feedback, errors, recovery, forms, destructive actions, navigation, accessibility, responsive behavior, and the states around the happy path.

**Good UX is just good manners.**

## What are we building?

Good Manners is a set of UX rules, deterministic checks, and coding-agent integrations for AI-generated frontends.

It helps coding agents think about questions such as:

- What happens while this is loading?
- What happens when it fails?
- Can the user retry without losing their work?
- Is a destructive action safe?
- Is the current system state clear?
- Can the interface be used with a keyboard?
- Does a form preserve valid input after an error?
- Does the layout still work on a small screen?
- Is the user being asked to remember something the interface could remember for them?

Good Manners does not decide what your product should look like.

It helps decide how your product should behave.

A design system can tell an agent what a button should look like.

**Good Manners helps it understand how that button should behave.**

## Why did we build it?

AI coding agents can produce good code very quickly.

But good engineering does not automatically produce a good experience.

You can have the right stack, clean architecture, strong typing, fast APIs, good tests, and well-written components.

The user does not experience those things directly.

The user experiences what that engineering becomes through the interface.

They experience:

- the form that erased their work
- the button that gave no feedback
- the error that offered no recovery
- the destructive action that was too easy to trigger
- the modal that broke keyboard navigation
- the page that technically worked on mobile but was painful to use

Frontend quality cannot stop at:

> "The code works."

The interface also has to behave well.

Good Manners exists to make that behavior part of the engineering process instead of an afterthought.

## How does it work?

Good Manners contains a canonical catalog of **100 UX rules** covering:

- core interaction behavior
- flows and system states
- feedback
- errors and recovery
- forms
- navigation
- destructive actions
- accessibility
- cognitive load
- responsive behavior

When an AI agent works on a frontend, Good Manners detects relevant signals from the task and source code.

For example:

~~~text
form + mutation + network
~~~

can bring in rules around:

~~~text
validation
submission state
preserving input
loading
failure
retry
feedback
~~~

Only the relevant rules are selected.

Deterministic problems are checked directly where possible.

Context-dependent UX decisions are handled by the coding agent with focused guidance.

When meaningful UI files change, Good Manners can also run one bounded final UX review.

If there is no meaningful problem, it stays out of the way.

If there is one, the agent gets one correction pass.

The goal is simple:

**Give the coding agent enough UX knowledge to make better decisions without dumping a giant checklist into its context.**

## How do you use it?

Install Good Manners once:

~~~sh
npx good-manners
~~~

Good Manners currently supports Claude Code and Codex.

After installation, keep using your coding agent normally.

You do not need to add a Good Manners prompt every time.

For example, you can simply ask:

~~~text
Build a profile settings form with async save.
~~~

Good Manners detects the relevant interface context and makes the appropriate UX rules available to the agent.

The workflow is:

~~~text
install once
    ↓
use your coding agent normally
    ↓
Good Manners detects the interface context
    ↓
relevant UX rules are selected
    ↓
deterministic UX issues are checked
    ↓
agent builds the UI
    ↓
focused final UX review
    ↓
done
~~~

### Commands

Install:

~~~sh
npx good-manners
~~~

Check installation status:

~~~sh
npx good-manners status
~~~

Check frontend files for deterministic UX issues:

~~~sh
npx good-manners check src
~~~

Browse the UX rule catalog:

~~~sh
npx good-manners rules
~~~

Search rules by category:

~~~sh
npx good-manners rules form
~~~

Search for a specific behavior:

~~~sh
npx good-manners rules "preserve input"
~~~

Run the built-in quality eval:

~~~sh
npx good-manners eval
~~~

Get machine-readable eval output:

~~~sh
npx good-manners eval --json
~~~

Update Good Manners:

~~~sh
npx good-manners update
~~~

Remove Good Manners:

~~~sh
npx good-manners uninstall
~~~

## What principles is Good Manners based on?

Good Manners does not invent a new theory of UX.

Its rules are informed by established work in human-computer interaction, usability, interaction design, and accessibility.

### Jakob Nielsen

Good Manners draws from **Nielsen's usability heuristics**, including:

- visibility of system status
- match between the system and the real world
- user control and freedom
- consistency and standards
- error prevention
- recognition rather than recall
- minimalist and relevant interfaces
- helping users recognize, diagnose, and recover from errors

These ideas influence Good Manners rules around feedback, loading, navigation, terminology, errors, recovery, and cognitive load.

### Don Norman

Good Manners draws from **Don Norman's principles of interaction design**, including:

- feedback
- signifiers
- constraints
- mappings
- conceptual clarity
- designing for human error
- making possible actions understandable

These principles influence how actions communicate intent, how interfaces respond to users, and how mistakes are prevented or recovered from.

### Ben Shneiderman

Good Manners also incorporates ideas from **Ben Shneiderman's Eight Golden Rules of Interface Design**, including:

- strive for consistency
- provide informative feedback
- design interactions with clear completion
- prevent errors
- permit easy reversal of actions
- keep users in control
- reduce short-term memory load

These ideas influence rules around undo, destructive actions, navigation, multi-step flows, feedback, and cognitive load.

### W3C and WCAG

Good Manners accessibility rules are informed by the **Web Content Accessibility Guidelines** and broader W3C accessibility practices.

They cover areas such as:

- semantic elements
- keyboard operation
- visible focus
- focus order
- accessible names
- error association
- meaningful image alternatives
- reduced motion
- reflow
- touch target size
- status announcements
- modal focus

Accessibility is treated as part of interaction quality, not as a separate finishing step.

### Fitts's Law

**Paul Fitts's work on target acquisition** informs rules around target size and spacing.

Important controls should be practical to reach and activate, especially on touch interfaces.

### Hick-Hyman Law

The work of **William Hick and Ray Hyman** informs Good Manners' treatment of choice overload and cognitive load.

More choices and unnecessary complexity increase the effort required to make a decision.

Interfaces should expose complexity when it becomes useful, not simply because it exists.

## What Good Manners is not

Good Manners is not a UI library.

It is not a component library.

It is not a visual design system.

It does not prescribe colors, typography, gradients, cards, spacing systems, or a particular aesthetic.

It works above those decisions.

**Visual systems define how an interface looks. Good Manners helps define how it treats the person using it.**

## License

MIT
