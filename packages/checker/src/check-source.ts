import type {
  CheckerIssue,
  CheckSourceInput,
} from './types.js'

type Tag = {
  name: string
  attrs: string
  full: string
  index: number
}

const GENERIC_INTERACTIVE = new Set([
  'div',
  'span',
  'p',
  'li',
])

function locationFor(
  source: string,
  index: number,
) {
  const before = source.slice(0, index)
  const lines = before.split('\n')

  return {
    line: lines.length,
    column:
      lines[lines.length - 1].length + 1,
  }
}

function snippetFor(
  source: string,
  index: number,
): string {
  const start =
    source.lastIndexOf('\n', index) + 1

  const next =
    source.indexOf('\n', index)

  const end =
    next === -1
      ? source.length
      : next

  return source
    .slice(start, end)
    .trim()
}

function attributeValue(
  attrs: string,
  name: string,
): string | null {
  const escaped =
    name.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    )

  const match = attrs.match(
    new RegExp(
      `(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*"([^"]*)"\\s*\\}|\\{\\s*'([^']*)'\\s*\\})`,
      'i',
    ),
  )

  if (!match) {
    return null
  }

  return (
    match[1] ??
    match[2] ??
    match[3] ??
    match[4] ??
    ''
  )
}

function hasAttribute(
  attrs: string,
  name: string,
): boolean {
  const escaped =
    name.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    )

  return new RegExp(
    `(?:^|\\s)${escaped}(?:\\s*=|\\s|$)`,
    'i',
  ).test(attrs)
}

function hasAccessibleNameAttribute(
  attrs: string,
): boolean {
  const ariaLabel =
    attributeValue(
      attrs,
      'aria-label',
    )

  return (
    (ariaLabel !== null &&
      ariaLabel.trim().length > 0) ||
    hasAttribute(
      attrs,
      'aria-labelledby',
    )
  )
}

function isInsideLabel(
  source: string,
  index: number,
): boolean {
  const open =
    source
      .slice(0, index)
      .toLowerCase()
      .lastIndexOf('<label')

  const close =
    source
      .slice(0, index)
      .toLowerCase()
      .lastIndexOf('</label>')

  return open > close
}

function collectLabelTargets(
  tags: Tag[],
): Set<string> {
  const targets = new Set<string>()

  for (const tag of tags) {
    if (tag.name !== 'label') {
      continue
    }

    const target =
      attributeValue(
        tag.attrs,
        'htmlFor',
      ) ??
      attributeValue(
        tag.attrs,
        'for',
      )

    if (target) {
      targets.add(target)
    }
  }

  return targets
}

function issue(
  input: CheckSourceInput,
  tag: Tag,
  id: CheckerIssue['id'],
  message: string,
): CheckerIssue {
  const location =
    locationFor(
      input.source,
      tag.index,
    )

  return {
    id,
    severity: 'warning',
    message,
    file: input.filePath,
    line: location.line,
    column: location.column,
    snippet:
      snippetFor(
        input.source,
        tag.index,
      ),
  }
}

export function checkSource(
  input: CheckSourceInput,
): CheckerIssue[] {
  const tags: Tag[] = []

  const tagPattern =
    /<([A-Za-z][\w:-]*)\b([^>]*?)\/?>/gs

  for (
    const match of
    input.source.matchAll(
      tagPattern,
    )
  ) {
    tags.push({
      name:
        match[1].toLowerCase(),
      attrs:
        match[2] ?? '',
      full: match[0],
      index: match.index ?? 0,
    })
  }

  const labelTargets =
    collectLabelTargets(tags)

  const issues: CheckerIssue[] = []

  for (const tag of tags) {
    /*
     * GMC001
     * Prefer native interactive elements instead
     * of generic containers with event handlers.
     */
    if (
      GENERIC_INTERACTIVE.has(
        tag.name,
      ) &&
      /\bon(?:click|keydown|keyup|keypress|mousedown|pointerdown)\s*=/i.test(
        tag.attrs,
      )
    ) {
      issues.push(
        issue(
          input,
          tag,
          'GMC001',
          'Use a native interactive element such as button or link instead of attaching interaction to a generic element.',
        ),
      )
    }

    /*
     * GMC002 / GMC003
     */
    if (
      tag.name === 'input' ||
      tag.name === 'select' ||
      tag.name === 'textarea'
    ) {
      const type =
        attributeValue(
          tag.attrs,
          'type',
        )?.toLowerCase()

      if (type === 'hidden') {
        continue
      }

      const id =
        attributeValue(
          tag.attrs,
          'id',
        )

      const hasAssociatedLabel =
        (id !== null &&
          labelTargets.has(id)) ||
        isInsideLabel(
          input.source,
          tag.index,
        ) ||
        hasAccessibleNameAttribute(
          tag.attrs,
        )

      if (!hasAssociatedLabel) {
        const placeholder =
          attributeValue(
            tag.attrs,
            'placeholder',
          )

        if (
          placeholder !== null &&
          placeholder.trim().length > 0
        ) {
          issues.push(
            issue(
              input,
              tag,
              'GMC003',
              'Do not use placeholder text as the only label for a form control. Provide a persistent accessible label.',
            ),
          )
        } else {
          issues.push(
            issue(
              input,
              tag,
              'GMC002',
              'Form controls need a persistent accessible label.',
            ),
          )
        }
      }
    }

    /*
     * GMC004
     * Detect buttons with no visible or explicit
     * accessible name.
     */
    if (
      tag.name === 'button' &&
      !hasAccessibleNameAttribute(
        tag.attrs,
      )
    ) {
      const contentStart =
        tag.index +
        tag.full.length

      const closeIndex =
        input.source
          .toLowerCase()
          .indexOf(
            '</button>',
            contentStart,
          )

      if (closeIndex !== -1) {
        const inner =
          input.source.slice(
            contentStart,
            closeIndex,
          )

        const visibleText =
          inner
            .replace(
              /<[^>]+>/g,
              '',
            )
            .replace(
              /\{[^}]*\}/g,
              '',
            )
            .trim()

        if (visibleText.length === 0) {
          issues.push(
            issue(
              input,
              tag,
              'GMC004',
              'Interactive controls need an accessible name. Add visible text or an accessible label.',
            ),
          )
        }
      }
    }
  }

  return issues
}
