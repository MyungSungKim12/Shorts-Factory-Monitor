import assert from 'node:assert/strict'
import test from 'node:test'

import {
  categoryLabel,
  formatNumber,
  formatRatio,
  performanceStatusClass,
  performanceStatusLabel,
} from './performanceInsights.js'

test('formats performance metrics for the dashboard', () => {
  assert.equal(formatNumber(1063.4, '회'), '1,063회')
  assert.equal(formatRatio(0.432), '43%')
  assert.equal(formatRatio(76.6), '77%')
  assert.equal(formatNumber(null, '회'), '-')
  assert.equal(formatRatio(undefined), '-')
})

test('labels collection status and categories', () => {
  assert.equal(performanceStatusLabel({ status: 'success' }), '수집 정상')
  assert.equal(performanceStatusClass({ status: 'partial' }), 'warn-text')
  assert.equal(performanceStatusLabel({ status: 'failed' }), '수집 실패')
  assert.equal(performanceStatusClass({}), 'dim')
  assert.equal(categoryLabel('hidden_world'), '숨겨진 세계')
  assert.equal(categoryLabel('custom'), 'custom')
})
