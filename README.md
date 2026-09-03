# Good Manners

**Build frontends that know how to behave.**

Good Manners helps AI coding agents build interfaces that are not only functional, but usable.

It brings established UX, HCI, and accessibility principles into the coding process so generated frontends handle the things that are often forgotten: feedback, loading, errors, recovery, forms, destructive actions, navigation, accessibility, responsive behavior, and the states around the happy path.

**Good UX is just good manners.**

## What are we building?

Good Manners is a set of UX rules, checks, and agent integrations for AI-generated frontends.

It helps coding agents answer questions such as:

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

It helps decide how the product should behave.

A design system can tell an agent what a button should look like.

**Good Manners helps it understand how that button should behave.**

## Why did we build it?

AI coding agents can produce good code very quickly.

But good engineering does not automatically produce a good experience.

You can have the right stack, clean architecture, strong typing, fast APIs, good tests, and well-written components. The user does not experience those things directly.

The user experiences the interface created from that engineering.

They experience the form that erased their work.

The button that gave no feedback.

The error that offered no recovery.

The destructive action that was too easy to trigger.

The modal that broke keyboard navigation.

The page that technically worked on mobile but was painful to use.

That is why frontend quality cannot stop at:

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

When an AI agent works on a frontend, Good Manners detects signals from the task and code.

For example:

```text
form + mutation + network
