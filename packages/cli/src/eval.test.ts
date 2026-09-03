import { describe, expect, it } from 'vitest'

import path from 'node:path'

import { formatEvalReport, runGoodMannersEval } from './eval.js'

const rulesPath = path.resolve('packages/skill/dist/good-manners/rules.json')

describe('Good Manners eval command', () => {
  it('runs all 40 selector, stress, and behavior scenarios', async () => {
    const report = await runGoodMannersEval(rulesPath)

    expect(report.cases.selector.total).toBe(5)

    expect(report.cases.stress.total).toBe(10)

    expect(report.cases.behavior.total).toBe(25)

    expect(report.cases.behavior.passed).toBe(25)

    expect(report.cases.total).toBe(40)

    expect(report.cases.passed).toBe(40)

    expect(report.metrics.expectedRuleRecall.value).toBeGreaterThanOrEqual(90)

    expect(report.metrics.nonUiFalseActivation.value).toBeLessThanOrEqual(5)

    expect(report.metrics.contextBudgetViolations).toBe(0)

    expect(report.passed).toBe(true)
  })

  it('formats a human-readable report', async () => {
    const report = await runGoodMannersEval(rulesPath)

    const output = formatEvalReport(report)

    expect(output).toContain('Good Manners / eval')

    expect(output).toContain('Selector')

    expect(output).toContain('Behavior')

    expect(output).toContain('40 / 40 scenarios passed')

    expect(output).toContain('Rule recall')

    expect(output).toContain('PASS')
  })
})
