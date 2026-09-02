import fs from 'node:fs/promises'

import {
  buildContext,
} from '../../core/src/selector/build-context.js'

import type {
  Rule,
} from '../../core/src/schema/rule.js'

import {
  selectorEvalCases,
} from '../../../evals/cases/selector/cases.js'

import {
  stressCases,
} from '../../../evals/cases/stress/cases.js'

import {
  bundledRulesPath,
} from './rules.js'

export type EvalCaseResult = {
  suite: 'selector' | 'stress'
  id: string
  passed: boolean
  failures: string[]
}

export type EvalMetric = {
  value: number
  numerator: number
  denominator: number
}

export type GoodMannersEvalReport = {
  version: 1
  passed: boolean
  cases: {
    passed: number
    total: number
    selector: {
      passed: number
      total: number
    }
    stress: {
      passed: number
      total: number
    }
  }
  metrics: {
    expectedRuleRecall: EvalMetric
    excludedRuleLeakage: EvalMetric
    expectedSignalRecall: EvalMetric
    nonUiFalseActivation: EvalMetric
    contextBudgetViolations: number
  }
  gates: {
    allCasesPass: boolean
    expectedRuleRecall: boolean
    excludedRuleLeakage: boolean
    expectedSignalRecall: boolean
    nonUiFalseActivation: boolean
    contextBudgetViolations: boolean
  }
  results: EvalCaseResult[]
}

type RulesDocument = {
  schema_version: 1
  rules: Rule[]
}

function percentage(
  numerator: number,
  denominator: number,
) {
  if (denominator === 0) {
    return 0
  }

  return Math.round(
    (numerator / denominator) *
      1000,
  ) / 10
}

function metric(
  numerator: number,
  denominator: number,
): EvalMetric {
  return {
    value: percentage(
      numerator,
      denominator,
    ),
    numerator,
    denominator,
  }
}

async function loadRules(
  rulesPath: string,
): Promise<Rule[]> {
  const parsed = JSON.parse(
    await fs.readFile(
      rulesPath,
      'utf8',
    ),
  ) as Partial<RulesDocument>

  if (
    parsed.schema_version !== 1 ||
    !Array.isArray(parsed.rules)
  ) {
    throw new Error(
      'Invalid Good Manners eval rule catalog.',
    )
  }

  return parsed.rules
}

export async function runGoodMannersEval(
  rulesPath = bundledRulesPath(),
): Promise<GoodMannersEvalReport> {
  const rules =
    await loadRules(rulesPath)

  const results: EvalCaseResult[] = []

  let expectedRules = 0
  let matchedExpectedRules = 0

  let excludedRules = 0
  let leakedExcludedRules = 0

  let expectedSignals = 0
  let matchedExpectedSignals = 0

  let nonUiCases = 0
  let nonUiFalseActivations = 0

  let contextBudgetViolations = 0

  for (const evalCase of selectorEvalCases) {
    const result = buildContext({
      rules,
      prompt: evalCase.prompt,
      source: evalCase.source,
      maxCharacters:
        evalCase.maxContextCharacters ??
        4800,
    })

    const signals = new Set(
      result.signals.map(
        (signal) => signal.name,
      ),
    )

    const selected = new Set(
      result.selected.map(
        (rule) => rule.id,
      ),
    )

    const failures: string[] = []

    for (
      const signal of
      evalCase.expectedSignals ?? []
    ) {
      expectedSignals += 1

      if (signals.has(signal)) {
        matchedExpectedSignals += 1
      } else {
        failures.push(
          `missing signal ${signal}`,
        )
      }
    }

    for (
      const rule of
      evalCase.expectedRules.mustInclude
    ) {
      expectedRules += 1

      if (selected.has(rule)) {
        matchedExpectedRules += 1
      } else {
        failures.push(
          `missing rule ${rule}`,
        )
      }
    }

    for (
      const rule of
      evalCase.expectedRules
        .mustNotInclude ?? []
    ) {
      excludedRules += 1

      if (selected.has(rule)) {
        leakedExcludedRules += 1
        failures.push(
          `unexpected rule ${rule}`,
        )
      }
    }

    const maxCharacters =
      evalCase.maxContextCharacters ??
      4800

    if (
      result.contextCharacters >
      maxCharacters
    ) {
      contextBudgetViolations += 1
      failures.push(
        `context ${result.contextCharacters} > ${maxCharacters}`,
      )
    }

    results.push({
      suite: 'selector',
      id: evalCase.id,
      passed: failures.length === 0,
      failures,
    })
  }

  for (const testCase of stressCases) {
    const result = buildContext({
      rules,
      prompt: testCase.prompt,
      source: testCase.source,
      maxCharacters:
        testCase.maxCharacters,
    })

    const selected = new Set(
      result.selected.map(
        (rule) => rule.id,
      ),
    )

    const failures: string[] = []

    for (
      const rule of
      testCase.mustInclude
    ) {
      expectedRules += 1

      if (selected.has(rule)) {
        matchedExpectedRules += 1
      } else {
        failures.push(
          `missing rule ${rule}`,
        )
      }
    }

    for (
      const rule of
      testCase.mustExclude ?? []
    ) {
      excludedRules += 1

      if (selected.has(rule)) {
        leakedExcludedRules += 1
        failures.push(
          `unexpected rule ${rule}`,
        )
      }
    }

    if (
      result.selected.length >
      testCase.maxSelectedRules
    ) {
      failures.push(
        `selected ${result.selected.length} rules > ${testCase.maxSelectedRules}`,
      )
    }

    if (
      result.contextCharacters >
      testCase.maxCharacters
    ) {
      contextBudgetViolations += 1
      failures.push(
        `context ${result.contextCharacters} > ${testCase.maxCharacters}`,
      )
    }

    if (testCase.maxSelectedRules === 0) {
      nonUiCases += 1

      if (
        result.active ||
        result.selected.length > 0
      ) {
        nonUiFalseActivations += 1
        failures.push(
          'backend-only task activated Good Manners',
        )
      }
    }

    results.push({
      suite: 'stress',
      id: testCase.id,
      passed: failures.length === 0,
      failures,
    })
  }

  const selectorResults =
    results.filter(
      (result) =>
        result.suite === 'selector',
    )

  const stressResults =
    results.filter(
      (result) =>
        result.suite === 'stress',
    )

  const casesPassed =
    results.filter(
      (result) => result.passed,
    ).length

  const metrics = {
    expectedRuleRecall:
      metric(
        matchedExpectedRules,
        expectedRules,
      ),

    excludedRuleLeakage:
      metric(
        leakedExcludedRules,
        excludedRules,
      ),

    expectedSignalRecall:
      metric(
        matchedExpectedSignals,
        expectedSignals,
      ),

    nonUiFalseActivation:
      metric(
        nonUiFalseActivations,
        nonUiCases,
      ),

    contextBudgetViolations,
  }

  const gates = {
    allCasesPass:
      casesPassed === results.length,

    expectedRuleRecall:
      metrics.expectedRuleRecall.value >= 90,

    excludedRuleLeakage:
      metrics.excludedRuleLeakage.value <= 10,

    expectedSignalRecall:
      metrics.expectedSignalRecall.value >= 90,

    nonUiFalseActivation:
      metrics.nonUiFalseActivation.value <= 5,

    contextBudgetViolations:
      contextBudgetViolations === 0,
  }

  return {
    version: 1,

    passed:
      Object.values(gates)
        .every(Boolean),

    cases: {
      passed: casesPassed,
      total: results.length,

      selector: {
        passed:
          selectorResults.filter(
            (result) => result.passed,
          ).length,
        total: selectorResults.length,
      },

      stress: {
        passed:
          stressResults.filter(
            (result) => result.passed,
          ).length,
        total: stressResults.length,
      },
    },

    metrics,
    gates,
    results,
  }
}

function metricLine(
  label: string,
  metricValue: EvalMetric,
  suffix = '%',
) {
  return [
    label.padEnd(28),
    `${metricValue.value.toFixed(1)}${suffix}`,
    `(${metricValue.numerator}/${metricValue.denominator})`,
  ].join(' ')
}

export function formatEvalReport(
  report: GoodMannersEvalReport,
) {
  const lines = [
    'Good Manners Eval',
    '',
    `Selector cases`.padEnd(28) +
      ` ${report.cases.selector.passed}/${report.cases.selector.total}`,
    `Stress cases`.padEnd(28) +
      ` ${report.cases.stress.passed}/${report.cases.stress.total}`,
    '',
    metricLine(
      'Expected-rule recall',
      report.metrics.expectedRuleRecall,
    ),
    metricLine(
      'Excluded-rule leakage',
      report.metrics.excludedRuleLeakage,
    ),
    metricLine(
      'Expected-signal recall',
      report.metrics.expectedSignalRecall,
    ),
    metricLine(
      'Non-UI false activation',
      report.metrics.nonUiFalseActivation,
    ),
    'Context budget violations'.padEnd(28) +
      ` ${report.metrics.contextBudgetViolations}`,
  ]

  const failures =
    report.results.filter(
      (result) => !result.passed,
    )

  if (failures.length > 0) {
    lines.push('')
    lines.push('Failures:')

    for (const failure of failures) {
      lines.push(
        `- ${failure.suite}/${failure.id}: ` +
        failure.failures.join('; '),
      )
    }
  }

  lines.push('')
  lines.push(
    report.passed
      ? 'PASS'
      : 'FAIL',
  )

  return lines.join('\n')
}
