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

const STATUS_ELEMENTS = new Set([
  'div',
  'span',
  'i',
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

function issueAt(
  input: CheckSourceInput,
  index: number,
  id: CheckerIssue['id'],
  message: string,
  severity: CheckerIssue['severity'] =
    'warning',
): CheckerIssue {
  const location =
    locationFor(
      input.source,
      index,
    )

  return {
    id,
    severity,
    message,
    file: input.filePath,
    line: location.line,
    column: location.column,
    snippet:
      snippetFor(
        input.source,
        index,
      ),
  }
}

function issueForTag(
  input: CheckSourceInput,
  tag: Tag,
  id: CheckerIssue['id'],
  message: string,
  severity: CheckerIssue['severity'] =
    'warning',
): CheckerIssue {
  return issueAt(
    input,
    tag.index,
    id,
    message,
    severity,
  )
}

function collectTags(
  source: string,
): Tag[] {
  const tags: Tag[] = []
  let cursor = 0

  while (cursor < source.length) {
    const start =
      source.indexOf('<', cursor)

    if (start === -1) {
      break
    }

    const next = source[start + 1]

    if (
      !next ||
      next === '/' ||
      next === '!' ||
      next === '?' ||
      next === '>'
    ) {
      cursor = start + 1
      continue
    }

    const nameMatch =
      source
        .slice(start + 1)
        .match(
          /^([A-Za-z][\w:-]*)/,
        )

    if (!nameMatch) {
      cursor = start + 1
      continue
    }

    const rawName = nameMatch[1]
    const attrsStart =
      start + 1 + rawName.length

    let index = attrsStart
    let braceDepth = 0
    let quote:
      | '"'
      | "'"
      | '`'
      | null = null
    let escaped = false
    let end = -1

    while (index < source.length) {
      const char = source[index]

      if (quote) {
        if (escaped) {
          escaped = false
        } else if (char === '\\') {
          escaped = true
        } else if (char === quote) {
          quote = null
        }

        index += 1
        continue
      }

      if (
        char === '"' ||
        char === "'" ||
        char === '`'
      ) {
        quote = char
        index += 1
        continue
      }

      if (char === '{') {
        braceDepth += 1
        index += 1
        continue
      }

      if (
        char === '}' &&
        braceDepth > 0
      ) {
        braceDepth -= 1
        index += 1
        continue
      }

      if (
        char === '>' &&
        braceDepth === 0
      ) {
        end = index
        break
      }

      index += 1
    }

    if (end === -1) {
      break
    }

    tags.push({
      name: rawName.toLowerCase(),
      attrs:
        source.slice(
          attrsStart,
          end,
        ),
      full:
        source.slice(
          start,
          end + 1,
        ),
      index: start,
    })

    cursor = end + 1
  }

  return tags
}

function escapeRegExp(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  )
}

function attributeValue(
  attrs: string,
  name: string,
): string | null {
  const escaped =
    escapeRegExp(name)

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
    escapeRegExp(name)

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

function isInsideTag(
  source: string,
  index: number,
  name: string,
): boolean {
  const before =
    source
      .slice(0, index)
      .toLowerCase()

  const open =
    before.lastIndexOf(
      `<${name}`,
    )

  const close =
    before.lastIndexOf(
      `</${name}>`,
    )

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

function innerContent(
  source: string,
  tag: Tag,
): string | null {
  if (
    tag.full.trimEnd().endsWith('/>')
  ) {
    return ''
  }

  const contentStart =
    tag.index +
    tag.full.length

  const closeIndex =
    source
      .toLowerCase()
      .indexOf(
        `</${tag.name}>`,
        contentStart,
      )

  if (closeIndex === -1) {
    return null
  }

  return source.slice(
    contentStart,
    closeIndex,
  )
}

function hasPotentialVisibleText(
  content: string,
): boolean {
  const withoutTags =
    content
      .replace(
        /<[^>]+>/g,
        '',
      )
      .replace(
        /<!--[\s\S]*?-->/g,
        '',
      )
      .trim()

  if (withoutTags.length === 0) {
    return false
  }

  /*
   * Dynamic expressions may produce visible text.
   * Be conservative instead of flagging them.
   */
  if (
    /\{[\s\S]*?\}/.test(
      withoutTags,
    )
  ) {
    return true
  }

  return withoutTags.length > 0
}

function hasPositiveTabIndex(
  attrs: string,
): boolean {
  const match = attrs.match(
    /(?:^|\s)tabindex\s*=\s*(?:"([1-9]\d*)"|'([1-9]\d*)'|\{\s*([1-9]\d*)\s*\}|([1-9]\d*))/i,
  )

  return Boolean(match)
}

function checkRemovedFocusIndicator(
  input: CheckSourceInput,
  issues: CheckerIssue[],
) {
  const focusBlockPattern =
    /:focus(?:-visible)?[^{]*\{([^}]*)\}/gi

  for (
    const match of
    input.source.matchAll(
      focusBlockPattern,
    )
  ) {
    const block = match[1] ?? ''

    if (
      !/outline\s*:\s*(?:none|0(?:\s*!important)?)(?:\s*;|$)/i.test(
        block,
      )
    ) {
      continue
    }

    /*
     * Avoid flagging an obvious replacement focus
     * indicator.
     */
    if (
      /(?:box-shadow|border(?:-color)?|text-decoration)\s*:/i.test(
        block,
      )
    ) {
      continue
    }

    const localOffset =
      match[0]
        .toLowerCase()
        .indexOf('outline')

    issues.push(
      issueAt(
        input,
        (match.index ?? 0) +
          Math.max(
            0,
            localOffset,
          ),
        'GMC006',
        'Do not remove the visible focus indicator unless an equally visible replacement is provided.',
      ),
    )
  }
}

function checkBlockedPaste(
  input: CheckSourceInput,
  issues: CheckerIssue[],
) {
  const pattern =
    /onPaste\s*=\s*\{[\s\S]{0,250}?preventDefault\s*\(/gi

  for (
    const match of
    input.source.matchAll(pattern)
  ) {
    issues.push(
      issueAt(
        input,
        match.index ?? 0,
        'GMC011',
        'Do not block paste in user input controls.',
        'error',
      ),
    )
  }
}

function checkRawErrorExposure(
  input: CheckSourceInput,
  issues: CheckerIssue[],
) {
  const pattern =
    /\{\s*(?:error|err|exception)\s*\.\s*(?:message|stack)\s*\}/gi

  for (
    const match of
    input.source.matchAll(pattern)
  ) {
    issues.push(
      issueAt(
        input,
        match.index ?? 0,
        'GMC012',
        'Do not expose raw exception messages or stack traces directly to users. Map failures to human-readable, actionable messages.',
        'error',
      ),
    )
  }
}

function checkDuplicateSubmitRisk(
  input: CheckSourceInput,
  issues: CheckerIssue[],
) {
  const formPattern =
    /<form\b[\s\S]{0,600}?onSubmit\s*=\s*\{\s*(?:async\b|\([^)]*\)\s*=>\s*\{?\s*async\b)[\s\S]{0,1800}?<button\b([^>]*)>/gi

  for (
    const match of
    input.source.matchAll(
      formPattern,
    )
  ) {
    const buttonAttrs =
      match[1] ?? ''

    if (
      !/(?:^|\s)type\s*=\s*(?:"submit"|'submit'|\{\s*"submit"\s*\}|\{\s*'submit'\s*\})/i.test(
        buttonAttrs,
      )
    ) {
      continue
    }

    if (
      hasAttribute(
        buttonAttrs,
        'disabled',
      ) ||
      hasAttribute(
        buttonAttrs,
        'aria-disabled',
      )
    ) {
      continue
    }

    const buttonOffset =
      match[0]
        .toLowerCase()
        .lastIndexOf('<button')

    issues.push(
      issueAt(
        input,
        (match.index ?? 0) +
          Math.max(
            0,
            buttonOffset,
          ),
        'GMC010',
        'Prevent duplicate submissions while an asynchronous submit is pending, for example by disabling or otherwise guarding the submit action.',
      ),
    )
  }
}

export function checkSource(
  input: CheckSourceInput,
): CheckerIssue[] {
  const tags =
    collectTags(input.source)

  const labelTargets =
    collectLabelTargets(tags)

  const issues: CheckerIssue[] = []

  for (const tag of tags) {
    /*
     * GMC001
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
        issueForTag(
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

      if (type !== 'hidden') {
        const id =
          attributeValue(
            tag.attrs,
            'id',
          )

        const hasAssociatedLabel =
          (id !== null &&
            labelTargets.has(id)) ||
          isInsideTag(
            input.source,
            tag.index,
            'label',
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
              issueForTag(
                input,
                tag,
                'GMC003',
                'Do not use placeholder text as the only label for a form control. Provide a persistent accessible label.',
              ),
            )
          } else {
            issues.push(
              issueForTag(
                input,
                tag,
                'GMC002',
                'Form controls need a persistent accessible label.',
              ),
            )
          }
        }
      }
    }

    /*
     * GMC004
     */
    if (
      tag.name === 'button' &&
      !hasAccessibleNameAttribute(
        tag.attrs,
      )
    ) {
      const content =
        innerContent(
          input.source,
          tag,
        )

      if (
        content !== null &&
        !hasPotentialVisibleText(
          content,
        )
      ) {
        issues.push(
          issueForTag(
            input,
            tag,
            'GMC004',
            'Interactive controls need an accessible name. Add visible text or an accessible label.',
          ),
        )
      }
    }

    /*
     * GMC005
     */
    if (
      hasPositiveTabIndex(
        tag.attrs,
      )
    ) {
      issues.push(
        issueForTag(
          input,
          tag,
          'GMC005',
          'Avoid positive tabindex values. Preserve the natural keyboard focus order.',
        ),
      )
    }

    /*
     * GMC007
     */
    if (
      tag.name === 'img' &&
      !hasAttribute(
        tag.attrs,
        'alt',
      )
    ) {
      issues.push(
        issueForTag(
          input,
          tag,
          'GMC007',
          'Images need alt handling. Provide meaningful alt text, or alt="" for decorative images.',
        ),
      )
    }

    /*
     * GMC008
     *
     * Conservative heuristic: flag an empty status
     * indicator whose semantics are expressed only
     * through status/color class names.
     */
    if (
      STATUS_ELEMENTS.has(
        tag.name,
      ) &&
      /\b(?:error|status|success|warning|invalid|danger)\b/i.test(
        tag.attrs,
      ) &&
      /\b(?:red|green|amber|yellow|orange|rose|emerald|lime)\b/i.test(
        tag.attrs,
      ) &&
      !hasAccessibleNameAttribute(
        tag.attrs,
      )
    ) {
      const content =
        innerContent(
          input.source,
          tag,
        )

      if (
        content !== null &&
        !hasPotentialVisibleText(
          content,
        )
      ) {
        issues.push(
          issueForTag(
            input,
            tag,
            'GMC008',
            'Do not communicate error or status information by color alone. Provide text or another accessible cue.',
          ),
        )
      }
    }

    /*
     * GMC009
     */
    if (
      tag.name === 'button' &&
      isInsideTag(
        input.source,
        tag.index,
        'form',
      ) &&
      !hasAttribute(
        tag.attrs,
        'type',
      )
    ) {
      issues.push(
        issueForTag(
          input,
          tag,
          'GMC009',
          'Buttons inside forms should declare an explicit type to avoid accidental implicit submission.',
        ),
      )
    }
  }

  /*
   * Checks that operate on broader source patterns
   * rather than a single opening tag.
   */
  checkRemovedFocusIndicator(
    input,
    issues,
  )

  checkDuplicateSubmitRisk(
    input,
    issues,
  )

  checkBlockedPaste(
    input,
    issues,
  )

  checkRawErrorExposure(
    input,
    issues,
  )

  return issues.sort(
    (a, b) =>
      a.line - b.line ||
      a.column - b.column ||
      a.id.localeCompare(b.id),
  )
}
