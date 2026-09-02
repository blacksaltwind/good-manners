import type {
  DetectedSignal,
  SignalSource,
} from './types.js'

import {
  SIGNAL_PATTERNS,
} from './vocabulary.js'

function detectFromText(
  text: string,
  source: SignalSource,
): DetectedSignal[] {
  const signals: DetectedSignal[] = []

  for (const [name, patterns] of Object.entries(
    SIGNAL_PATTERNS,
  )) {
    if (
      patterns.some((pattern) =>
        pattern.test(text),
      )
    ) {
      signals.push({
        name,
        source,
      })
    }
  }

  return signals
}

export type DetectSignalsInput = {
  prompt?: string
  source?: string[]
}

export function detectSignals(
  input: DetectSignalsInput,
): DetectedSignal[] {
  const detected: DetectedSignal[] = []

  if (input.prompt) {
    detected.push(
      ...detectFromText(
        input.prompt,
        'prompt',
      ),
    )
  }

  for (const source of input.source ?? []) {
    detected.push(
      ...detectFromText(
        source,
        'source',
      ),
    )
  }

  const unique = new Map<
    string,
    DetectedSignal
  >()

  for (const signal of detected) {
    const key = `${signal.source}:${signal.name}`

    unique.set(key, signal)
  }

  return [...unique.values()]
}
