import fs from 'node:fs/promises'
import path from 'node:path'

import {
  loadRulesDirectory,
  type Rule,
} from '../../core/src/index.js'

const packageRoot = path.resolve(
  import.meta.dirname,
  '..',
)

const repoRoot = path.resolve(
  packageRoot,
  '../..',
)


const publicPackageRoot = path.join(
  repoRoot,
  'packages',
  'cli',
)

const publicPackage = JSON.parse(
  await fs.readFile(
    path.join(
      publicPackageRoot,
      'package.json',
    ),
    'utf8',
  ),
) as { version: string }

const PUBLIC_VERSION = publicPackage.version

const skillRoot = path.join(
  packageRoot,
  'dist',
  'good-manners',
)

const rulesRoot = path.join(
  repoRoot,
  'packages',
  'core',
  'rules',
)

const referencesRoot = path.join(
  skillRoot,
  'references',
)

function formatRule(rule: Rule): string {
  return `- **${rule.id}** [${rule.severity.toUpperCase()}] ${rule.instruction}`
}

function categoryTitle(
  category: string,
): string {
  return category
    .split('-')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(' ')
}

async function writeSkillMd() {
  const content = `---
name: good-manners
description: Human-first UX and usability guardrails for creating, changing, reviewing, or debugging user-facing interfaces. Use for forms, navigation, loading states, errors, destructive actions, accessibility, user flows, interaction design, and other frontend UX work.
license: MIT
metadata:
  version: "${PUBLIC_VERSION}"
---

# Good Manners

Good UX is just good manners.

Use Good Manners whenever the task creates or materially changes a user-facing interface or interaction.

Do not activate for backend-only work, infrastructure, database queries, utility refactors, or other changes that do not affect user interaction.

## Priorities

Prioritize, in order:

1. Task completion and clarity.
2. User control and error prevention.
3. Recovery from failure and interruption.
4. Accessibility.
5. Cognitive simplicity.
6. Consistency and predictable behavior.
7. Visual refinement.

Do not add UI merely to make the interface look designed.

## Before implementation

Identify the interaction types actually present in the task.

Load only the relevant references:

- Forms or user input: [references/form.md](references/form.md)
- Errors or recovery: [references/error.md](references/error.md)
- Loading, success, empty, retry, interruption, or other states: [references/flow.md](references/flow.md)
- Feedback or asynchronous operations: [references/feedback.md](references/feedback.md)
- Navigation: [references/navigation.md](references/navigation.md)
- Destructive actions: [references/destructive.md](references/destructive.md)
- Accessibility or interactive controls: [references/accessibility.md](references/accessibility.md)
- Cognitive load, wording, hierarchy, or choices: [references/cognitive.md](references/cognitive.md)
- Responsive or input-method behavior: [references/responsive.md](references/responsive.md)

The universal principles in [references/core.md](references/core.md) apply to meaningful UI work, but do not load unrelated reference files.

## Flow completeness

For any meaningful user action, consider only the states that can actually occur:

- entry
- pending
- success
- empty
- validation failure
- system failure
- network failure
- permission failure
- session expiration
- cancellation
- interruption
- retry
- partial success
- duplicate action
- recovery

Do not invent states that are impossible or irrelevant.

## Severity

- MUST: serious usability, accessibility, data-loss, dead-end, or recovery requirement when relevant.
- SHOULD: strong default that context may override.
- CONSIDER: design judgment, never a blocking requirement.

Severity indicates importance when a rule is relevant. It does not mean every MUST rule should be loaded for every interface.

## Final review

Before finishing meaningful UI changes:

1. Review only the interaction behavior changed by the current task.
2. Check relevant failure, recovery, loading, empty, cancellation, and interruption states.
3. Fix relevant MUST issues.
4. Fix SHOULD issues only when clearly justified.
5. Do not redesign unrelated UI.
6. Do not add decorative components just to satisfy the review.
7. Do not narrate a successful Good Manners checklist to the user.

Keep the review focused and perform it once.
`

  await fs.writeFile(
    path.join(skillRoot, 'SKILL.md'),
    content,
  )
}


async function writeRulesJson(
  rules: Rule[],
) {
  await fs.writeFile(
    path.join(
      skillRoot,
      'rules.json',
    ),
    JSON.stringify(
      {
        schema_version: 1,
        rules,
      },
      null,
      2,
    ) + '\n',
  )
}

async function writeReference(
  category: string,
  rules: Rule[],
) {
  const title =
    categoryTitle(category)

  const must = rules.filter(
    (rule) =>
      rule.severity === 'must',
  )

  const should = rules.filter(
    (rule) =>
      rule.severity === 'should',
  )

  const consider = rules.filter(
    (rule) =>
      rule.severity === 'consider',
  )

  const sections = [
    `# ${title}`,
    '',
    'Load this reference only when this category is relevant to the current interface task.',
    '',
  ]

  if (must.length > 0) {
    sections.push(
      '## MUST',
      '',
      ...must.map(formatRule),
      '',
    )
  }

  if (should.length > 0) {
    sections.push(
      '## SHOULD',
      '',
      ...should.map(formatRule),
      '',
    )
  }

  if (consider.length > 0) {
    sections.push(
      '## CONSIDER',
      '',
      ...consider.map(formatRule),
      '',
    )
  }

  await fs.writeFile(
    path.join(
      referencesRoot,
      `${category}.md`,
    ),
    sections.join('\n'),
  )
}

async function main() {
  await fs.rm(skillRoot, {
    recursive: true,
    force: true,
  })

  await fs.mkdir(
    referencesRoot,
    {
      recursive: true,
    },
  )

  const rules =
    await loadRulesDirectory(
      rulesRoot,
    )

  if (rules.length !== 100) {
    throw new Error(
      `Expected 100 rules, found ${rules.length}`,
    )
  }

  const categories = new Map<
    string,
    Rule[]
  >()

  for (const rule of rules) {
    const list =
      categories.get(
        rule.category,
      ) ?? []

    list.push(rule)

    categories.set(
      rule.category,
      list,
    )
  }

  await writeSkillMd()
  await writeRulesJson(rules)

  await fs.copyFile(
    path.join(
      repoRoot,
      'packages',
      'core',
      'ui-files.json',
    ),
    path.join(
      skillRoot,
      'ui-files.json',
    ),
  )

  for (
    const [category, categoryRules]
    of categories
  ) {
    await writeReference(
      category,
      categoryRules,
    )
  }

  await fs.copyFile(
    path.join(repoRoot, 'LICENSE'),
    path.join(
      skillRoot,
      'LICENSE',
    ),
  )

  console.log(
    `Built Good Manners skill with ${rules.length} rules`,
  )

  console.log(
    skillRoot,
  )
}

await main()
