import type {
  DetectedSignal,
} from './types.js'

const UI_SIGNALS = new Set([
  'ui',
  'interactive',
  'form',
  'overlay',
  'navigation',
  'search',
  'list',
  'table',
  'selection',
  'upload',
  'destructive',
  'touch',
  'image',
  'icon',
  'settings',
  'multi-step',
])

export function shouldActivate(
  signals: DetectedSignal[],
): boolean {
  return signals.some(
    (signal) =>
      UI_SIGNALS.has(signal.name),
  )
}
