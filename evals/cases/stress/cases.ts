export type StressCase = {
  id: string
  prompt: string
  source?: string[]

  mustInclude: string[]
  mustExclude?: string[]

  maxSelectedRules: number
  maxCharacters: number
}

export const stressCases: StressCase[] = [
  {
    id: 'static-about-page',
    prompt:
      'Build a simple about page with a heading and a few paragraphs.',
    mustInclude: [
      'core.primary-task',
      'core.real-world-language',
    ],
    mustExclude: [
      'flow.retry',
      'flow.network-failure',
      'destructive.confirm-irreversible',
      'error.preserve-input',
    ],
    maxSelectedRules: 18,
    maxCharacters: 4800,
  },

  {
    id: 'login-form',
    prompt:
      'Build a login form with email, password, submit button, loading state, and incorrect credentials error.',
    mustInclude: [
      'form.persistent-label',
      'form.submit-state',
      'error.actionable-next-step',
      'accessibility.accessible-name',
    ],
    mustExclude: [
      'destructive.confirm-irreversible',
      'flow.partial-success',
    ],
    maxSelectedRules: 30,
    maxCharacters: 4800,
  },

  {
    id: 'delete-account',
    prompt:
      'Build account settings with an option to permanently delete the user account.',
    mustInclude: [
      'destructive.confirm-irreversible',
      'destructive.explicit-label',
      'destructive.prevent-accidental',
    ],
    mustExclude: [
      'destructive.prefer-undo',
    ],
    maxSelectedRules: 28,
    maxCharacters: 4800,
  },

  {
    id: 'search-results',
    prompt:
      'Build a product search page with filters, loading, empty results, and API failure.',
    mustInclude: [
      'flow.loading',
      'flow.empty',
      'feedback.no-silent-failure',
    ],
    mustExclude: [
      'destructive.confirm-irreversible',
    ],
    maxSelectedRules: 32,
    maxCharacters: 4800,
  },

  {
    id: 'file-upload',
    prompt:
      'Build a file upload interface with progress, cancel, invalid file errors, retry, and successful completion.',
    mustInclude: [
      'feedback.progress',
      'flow.cancellation',
      'flow.retry',
      'error.actionable-next-step',
    ],
    mustExclude: [
      'destructive.confirm-irreversible',
    ],
    maxSelectedRules: 34,
    maxCharacters: 4800,
  },

  {
    id: 'modal-form',
    prompt:
      'Build a modal containing a form that edits a user profile and can be cancelled.',
    mustInclude: [
      'core.user-control',
      'accessibility.modal-focus',
      'form.persistent-label',
    ],
    mustExclude: [
      'flow.partial-success',
    ],
    maxSelectedRules: 32,
    maxCharacters: 4800,
  },

  {
    id: 'multi-step-wizard',
    prompt:
      'Build a three-step onboarding wizard where users can go back and resume later.',
    mustInclude: [
      'flow.interruption-resume',
      'core.user-control',
      'cognitive.no-cross-step-memory',
    ],
    mustExclude: [
      'destructive.confirm-irreversible',
    ],
    maxSelectedRules: 32,
    maxCharacters: 4800,
  },

  {
    id: 'async-profile-save',
    prompt:
      'Build profile settings where changing the name saves asynchronously.',
    source: [
      `
      async function saveProfile(data) {
        return fetch('/api/profile', {
          method: 'PATCH',
          body: JSON.stringify(data),
        })
      }
      `,
    ],
    mustInclude: [
      'core.system-status',
      'error.preserve-input',
      'feedback.no-silent-failure',
    ],
    mustExclude: [
      'destructive.confirm-irreversible',
    ],
    maxSelectedRules: 32,
    maxCharacters: 4800,
  },

  {
    id: 'navigation-sidebar',
    prompt:
      'Build a dashboard with sidebar navigation and nested settings pages.',
    mustInclude: [
      'navigation.current-location',
      'navigation.back-predictable',
      'navigation.no-dead-end',
    ],
    mustExclude: [
      'flow.retry',
      'destructive.confirm-irreversible',
    ],
    maxSelectedRules: 28,
    maxCharacters: 4800,
  },

  {
    id: 'backend-only',
    prompt:
      'Refactor this Node.js database repository function to reduce duplicate SQL queries.',
    mustInclude: [],
    maxSelectedRules: 0,
    maxCharacters: 0,
  },
]
