export type SelectorEvalCase = {
  id: string

  prompt: string

  source?: string[]

  expectedSignals?: string[]

  expectedRules: {
    mustInclude: string[]
    mustNotInclude?: string[]
  }

  maxContextCharacters?: number
}
