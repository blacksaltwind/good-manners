export type CheckId =
  | 'GMC001'
  | 'GMC002'
  | 'GMC003'
  | 'GMC004'

export type CheckerIssue = {
  id: CheckId
  severity: 'warning' | 'error'
  message: string
  file?: string
  line: number
  column: number
  snippet: string
}

export type CheckSourceInput = {
  source: string
  filePath?: string
}
