export const SIGNAL_ANCHOR_RULES: Record<
  string,
  string[]
> = {
  form: [
    'form.persistent-label',
    'form.submit-state',
  ],

  interactive: [
    'accessibility.keyboard',
    'accessibility.accessible-name',
  ],

  error: [
    'error.actionable-next-step',
    'feedback.no-silent-failure',
  ],

  async: [
    'core.system-status',
    'flow.loading',
  ],

  network: [
    'flow.network-failure',
    'error.actionable-next-step',
  ],

  destructive: [
    'destructive.explicit-label',
    'destructive.prevent-accidental',
  ],

  irreversible: [
    'destructive.confirm-irreversible',
  ],

  overlay: [
    'accessibility.modal-focus',
    'core.user-control',
  ],

  'multi-step': [
    'core.user-control',
    'cognitive.no-cross-step-memory',
  ],

  navigation: [
    'navigation.back-predictable',
    'navigation.no-dead-end',
  ],

  upload: [
    'feedback.progress',
    'flow.cancellation',
  ],

  search: [
    'flow.empty',
  ],
}
