import type {
  SelectorEvalCase,
} from '../../runner/types.js'

export const selectorEvalCases: SelectorEvalCase[] = [
  {
    id: 'form-save',

    prompt:
      'Build a form that saves profile changes.',

    expectedSignals: [
      'form',
      'mutation',
    ],

    expectedRules: {
      mustInclude: [
        'core.error-prevention',
        'error.preserve-input',
      ],
    },

    maxContextTokens: 1200,
  },

  {
    id: 'delete-account',

    prompt:
      'Build a screen where the user can permanently delete their account.',

    expectedSignals: [
      'destructive',
      'irreversible',
      'mutation',
    ],

    expectedRules: {
      mustInclude: [
        'core.error-prevention',
      ],

      mustNotInclude: [
        'core.reversibility',
      ],
    },

    maxContextTokens: 1200,
  },

  {
    id: 'login-form',

    prompt:
      'Create a login form with email and password.',

    expectedSignals: [
      'form',
      'authentication',
    ],

    expectedRules: {
      mustInclude: [
        'core.error-prevention',
      ],
    },

    maxContextTokens: 1200,
  },

  {
    id: 'async-save-source',

    prompt:
      'Build profile settings.',

    source: [
      `
      async function saveProfile(data) {
        await fetch('/api/profile', {
          method: 'POST',
          body: JSON.stringify(data),
        })
      }
      `,
    ],

    expectedSignals: [
      'async',
      'mutation',
      'network',
    ],

    expectedRules: {
      mustInclude: [
        'core.system-status',
        'error.preserve-input',
      ],
    },

    maxContextTokens: 1200,
  },

  {
    id: 'simple-content-screen',

    prompt:
      'Build a simple about page with static text.',

    expectedRules: {
      mustInclude: [
        'core.primary-task',
        'core.real-world-language',
      ],

      mustNotInclude: [
        'error.preserve-input',
      ],
    },

    maxContextTokens: 1200,
  },
]
