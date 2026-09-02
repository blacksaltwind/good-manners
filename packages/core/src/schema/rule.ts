import { z } from 'zod'

export const RuleSeveritySchema = z.enum([
  'must',
  'should',
  'consider',
])

export const RuleCategorySchema = z.enum([
  'core',
  'flow',
  'feedback',
  'error',
  'form',
  'navigation',
  'destructive',
  'accessibility',
  'cognitive',
  'responsive',
])

export const RuleSchema = z.object({
  schema_version: z.literal(1),

  id: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/,
      'Rule IDs must be lowercase and dot/dash separated',
    ),

  version: z.number().int().positive(),

  title: z.string().min(1),

  category: RuleCategorySchema,

  severity: RuleSeveritySchema,

  instruction: z.string().min(1).max(300),

  tags: z.array(z.string()).default([]),

  applies_when: z
    .object({
      any: z.array(z.string()).default([]),
      all: z.array(z.string()).default([]),
      none: z.array(z.string()).default([]),
    })
    .default({
      any: [],
      all: [],
      none: [],
    }),

  review: z
    .object({
      question: z.string().min(1),
    })
    .optional(),

  checks: z.object({
    deterministic: z.array(z.string()).default([]),
    agent: z.boolean(),
    autofix: z.enum(['none', 'suggest', 'safe']),
  }),

  exceptions: z.array(z.string()).default([]),

  related: z.array(z.string()).default([]),
})

export type Rule = z.infer<typeof RuleSchema>
