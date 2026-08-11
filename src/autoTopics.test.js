import test from 'node:test'
import assert from 'node:assert/strict'

import { autoTopicStatus } from './autoTopics.js'


test('automatic topic status uses clear Korean dashboard labels', () => {
  assert.equal(autoTopicStatus('prepared'), '제작 완료 · 업로드 대기')
  assert.equal(autoTopicStatus('uploaded'), '업로드 완료')
  assert.equal(autoTopicStatus('unknown'), '상태 확인 필요')
})
