import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatKstDateTime,
  mergeSlotEvents,
  slotDateKeys,
  slotPollDelay,
  userFacingSlotError,
} from './slotView.js'


test('slot manager requests the current and following KST calendar days', () => {
  assert.deepEqual(slotDateKeys(new Date('2026-08-09T16:30:00Z')), [
    '2026-08-10',
    '2026-08-11',
  ])
})


test('incremental event pages append in order without duplicate event IDs', () => {
  const current = [
    { id: 7, message: '검증 시작' },
    { id: 8, message: '자료 확인' },
  ]
  const incoming = [
    { id: 8, message: '중복 응답' },
    { id: 10, message: '완료' },
    { id: 9, message: '품질 확인' },
  ]

  assert.deepEqual(mergeSlotEvents(current, incoming), [
    { id: 7, message: '검증 시작' },
    { id: 8, message: '자료 확인' },
    { id: 9, message: '품질 확인' },
    { id: 10, message: '완료' },
  ])
})


test('slot errors use stable Korean guidance instead of backend payload text', () => {
  const unauthorized = Object.assign(new Error('provider raw response'), { status: 401 })
  const conflict = Object.assign(new Error('worker secret'), { status: 409 })

  assert.equal(userFacingSlotError(unauthorized), '관리자 토큰을 확인해 주세요.')
  assert.equal(userFacingSlotError(conflict), '회차 상태가 변경되었습니다. 새로고침 후 다시 시도해 주세요.')
})


test('slot timestamps are displayed as KST calendar time', () => {
  assert.equal(formatKstDateTime('2026-08-10T02:00:00Z'), '8월 10일 11:00')
})


test('slot polling uses two seconds for active work and thirty seconds when idle', () => {
  assert.equal(slotPollDelay([{ state: 'producing' }]), 2000)
  assert.equal(slotPollDelay([{ state: 'reserved' }, { state: 'auto' }]), 30000)
})
