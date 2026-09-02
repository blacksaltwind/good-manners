export {
  RuleSchema,
  RuleCategorySchema,
  RuleSeveritySchema,
  type Rule,
} from './schema/rule.js'

export {
  loadRuleFile,
} from './schema/load-rule.js'

export {
  loadRulesDirectory,
} from './schema/load-rules.js'

export {
  detectSignals,
  type DetectSignalsInput,
} from './signals/detect-signals.js'

export type {
  DetectedSignal,
  SignalSource,
} from './signals/types.js'

export {
  isRuleApplicable,
} from './selector/applicability.js'

export {
  scoreRule,
} from './selector/score-rule.js'

export {
  selectRules,
  type SelectRulesInput,
  type SelectRulesResult,
  type SelectedRule,
} from './selector/select-rules.js'

export {
  buildContext,
  type BuildContextInput,
} from './selector/build-context.js'

export {
  renderContext,
  type RenderContextInput,
  type RenderContextResult,
} from './context-packet/render-context.js'

export {
  shouldActivate,
} from './signals/should-activate.js'


export {
  buildReviewContext,
} from './context-packet/review-context.js'

export type {
  ReviewIssue,
  BuildReviewContextInput,
  BuildReviewContextResult,
} from './context-packet/review-context.js'

export {
  filterMeaningfulUiFiles,
  isMeaningfulUiFile,
} from './context-packet/changed-files.js'
