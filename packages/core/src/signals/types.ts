export type SignalSource =
  | 'prompt'
  | 'source'
  | 'operation'
  | 'component'
  | 'risk'

export type DetectedSignal = {
  name: string
  source: SignalSource
}
