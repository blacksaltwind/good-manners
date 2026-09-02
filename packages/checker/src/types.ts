export type CheckId =
  | 'GMC001'
  | 'GMC002'
  | 'GMC003'
  | 'GMC004'
  | 'GMC005'
  | 'GMC006'
  | 'GMC007'
  | 'GMC008'
  | 'GMC009'
  | 'GMC010'
  | 'GMC011'
  | 'GMC012'

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
