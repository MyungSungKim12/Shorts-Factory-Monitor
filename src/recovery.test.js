import test from 'node:test'
import assert from 'node:assert/strict'

import { formatRecovery } from './recovery.js'


test('formats every recovery state with attempts', () => {
  const cases = [
    ['scheduled', '재시도 예정', 'recovery-scheduled'],
    ['running', '재시도 중', 'recovery-running'],
    ['recovered', '자동 복구 완료', 'recovery-recovered'],
    ['exhausted', '자동 복구 실패', 'recovery-exhausted'],
  ]
  for (const [status, label, className] of cases) {
    const result = formatRecovery({ status, attempts: 2 })
    assert.equal(result.label, label)
    assert.equal(result.className, className)
    assert.match(result.detail, /시도 2회/)
  }
})


test('scheduled recovery shows next retry and complete error', () => {
  const error = '오디오 합성 중 연결이 끊겼으며 이 문장은 축약되면 안 됩니다'
  const result = formatRecovery({
    status: 'scheduled', attempts: 1, failed_stage: 'producer',
    last_error: error, next_retry_at: '2026-07-21T11:15:00+09:00',
  })
  assert.match(result.detail, /다음 재시도/)
  assert.match(result.detail, /producer/)
  assert.match(result.detail, new RegExp(error))
})


test('missing or unknown recovery is ignored', () => {
  assert.equal(formatRecovery(null), null)
  assert.equal(formatRecovery({ status: 'other' }), null)
})

