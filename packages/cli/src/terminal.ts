const ESC = '\x1b['

function colorEnabled() {
  return Boolean(
    process.stdout.isTTY &&
    !process.env.NO_COLOR &&
    !process.env.CI &&
    process.env.TERM !== 'dumb',
  )
}

const enabled = colorEnabled()

function wrap(
  open: number,
  close: number,
  value: string,
) {
  if (!enabled) {
    return value
  }

  return `${ESC}${open}m${value}${ESC}${close}m`
}

export const bold = (value: string) =>
  wrap(1, 22, value)

export const muted = (value: string) =>
  wrap(2, 22, value)

export const accent = (value: string) =>
  wrap(36, 39, value)

export const successTone = (value: string) =>
  wrap(32, 39, value)

export const warningTone = (value: string) =>
  wrap(33, 39, value)

export const dangerTone = (value: string) =>
  wrap(31, 39, value)

export function header(section?: string) {
  if (!section) {
    return [
      bold('Good Manners'),
      muted('Build frontends that know how to behave.'),
    ].join('\n')
  }

  return `${bold('Good Manners')} ${muted('/')} ${bold(section)}`
}

export const success = (value: string) =>
  `${successTone('✓')} ${value}`

export const warning = (value: string) =>
  `${warningTone('!')} ${value}`

export const failure = (value: string) =>
  `${dangerTone('×')} ${value}`

export const info = (value: string) =>
  `${accent('•')} ${value}`

export const detail = (value: string) =>
  `  ${muted(value)}`

export const command = (value: string) =>
  accent(value)

export function row(
  label: string,
  value: string,
  width = 24,
) {
  return `  ${muted(label.padEnd(width))}${value}`
}

export function severity(value: string) {
  if (value.toLowerCase() === 'must') {
    return accent(value.toUpperCase())
  }

  if (value.toLowerCase() === 'should') {
    return warningTone(value.toUpperCase())
  }

  return muted(value.toUpperCase())
}
