import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatCountdown,
  shouldPollFast,
  slotActions,
  slotProgress,
} from './slotState.js'
import { createSlotClient } from './slotApi.js'


function slot(overrides = {}) {
  return {
    run_id: '20260810-1',
    state: 'auto',
    worker_id: null,
    production_at: '2026-08-10T09:00:00+09:00',
    upload_at: '2026-08-10T11:00:00+09:00',
    ...overrides,
  }
}


test('reserved slot disables new input at production cutoff', () => {
  const actions = slotActions(
    slot({ state: 'reserved', production_at: '2026-08-10T09:00:00+09:00' }),
    new Date('2026-08-10T09:00:00+09:00'),
  )

  assert.equal(actions.canEdit, false)
})


test('rejected slot requires the explicit replacement action after worker release', () => {
  const actions = slotActions(
    slot({ state: 'rejected', worker_id: null }),
    new Date('2026-08-10T08:59:00+09:00'),
  )

  assert.equal(actions.canCheck, false)
  assert.equal(actions.canRetry, true)
})


test('explicit replacement draft remains checkable after the original cutoff', () => {
  const replacement = slot({
    state: 'draft', worker_id: null, replacement_allowed: true,
  })

  assert.equal(
    slotActions(replacement, new Date('2026-08-10T09:00:00+09:00')).canCheck,
    true,
  )
  assert.equal(
    slotActions(replacement, new Date('2026-08-10T09:01:00+09:00')).canCheck,
    true,
  )
})


test('reserve is exposed only before cutoff or for an explicit replacement', () => {
  const afterCutoff = new Date('2026-08-10T09:01:00+09:00')

  assert.equal(slotActions(slot({ state: 'reservable' }), afterCutoff).canReserve, false)
  assert.equal(slotActions(slot({
    state: 'reservable', replacement_allowed: true,
  }), afterCutoff).canReserve, true)
})


test('review ready exposes approval and rejection only', () => {
  const actions = slotActions(slot({ state: 'review_ready' }), new Date())

  assert.equal(actions.canApprove, true)
  assert.equal(actions.canReject, true)
  assert.equal(actions.canEdit, false)
  assert.equal(actions.canRetry, false)
})


test('active worker prevents retry and skip until it releases the slot', () => {
  const actions = slotActions(
    slot({ state: 'failed', worker_id: 'producer-1' }),
    new Date('2026-08-10T10:00:00+09:00'),
  )

  assert.equal(actions.canRetry, false)
  assert.equal(actions.canSkip, false)
})


test('progress identifies the production stage with a bounded percentage', () => {
  assert.deepEqual(slotProgress('producing'), {
    index: 7,
    total: 13,
    percent: 54,
    label: '영상 제작 중',
  })
})


test('countdown reports remaining hours and a passed production cutoff', () => {
  const now = new Date('2026-08-10T07:55:00+09:00')

  assert.equal(formatCountdown('2026-08-10T09:00:00+09:00', now), '1시간 05분')
  assert.equal(formatCountdown('2026-08-10T07:55:00+09:00', now), '마감됨')
})


test('fast polling includes active production, review, and held states only', () => {
  assert.equal(shouldPollFast(slot({ state: 'producing' })), true)
  assert.equal(shouldPollFast(slot({ state: 'review_ready' })), true)
  assert.equal(shouldPollFast(slot({ state: 'held' })), true)
  assert.equal(shouldPollFast(slot({ state: 'reserved' })), false)
})


function jsonResponse(value, options = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    async json() { return value },
  }
}


test('slot client uses the documented methods, paths, bodies, and per-call token', async () => {
  const requests = []
  let token = 'first-token'
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url, init })
    return jsonResponse({ url })
  }
  const client = createSlotClient({ getToken: () => token, fetchImpl })

  const calls = [
    ['list', () => client.listSlots('2026-08-10'), '/api/slots?date=2026-08-10', 'GET', undefined],
    ['detail', () => client.getSlot('20260810-1'), '/api/slots/20260810-1', 'GET', undefined],
    ['check', () => client.checkTopic('20260810-1', { topic_input: '달의 바다' }), '/api/slots/20260810-1/check-topic', 'POST', { topic_input: '달의 바다' }],
    ['reserve', () => client.reserve('20260810-1'), '/api/slots/20260810-1/reservation', 'PUT', { checked: true }],
    ['cancel', () => client.cancel('20260810-1'), '/api/slots/20260810-1/reservation', 'DELETE', undefined],
    ['events', () => client.events('20260810-1', 8, 25), '/api/slots/20260810-1/events?after_id=8&limit=25', 'GET', undefined],
    ['approve', () => client.approve('20260810-1'), '/api/slots/20260810-1/approve', 'POST', undefined],
    ['reject', () => client.reject('20260810-1', '다시 제작'), '/api/slots/20260810-1/reject', 'POST', { reason: '다시 제작' }],
    ['retry', () => client.retry('20260810-1', 'same_topic'), '/api/slots/20260810-1/retry', 'POST', { mode: 'same_topic' }],
    ['skip', () => client.skip('20260810-1'), '/api/slots/20260810-1/skip', 'POST', undefined],
  ]

  for (const [, invoke] of calls) await invoke()
  token = 'second-token'
  await client.approve('20260810-2')

  for (let index = 0; index < calls.length; index += 1) {
    const [, , url, method, body] = calls[index]
    const request = requests[index]
    assert.equal(request.url, url)
    assert.equal(request.init.method, method)
    if (body) assert.deepEqual(JSON.parse(request.init.body), body)
  }
  assert.equal(requests[0].init.headers?.['X-Token'], 'first-token')
  assert.equal(requests[1].init.headers?.['X-Token'], 'first-token')
  assert.equal(requests[5].init.headers?.['X-Token'], undefined)
  assert.equal(requests[2].init.headers['X-Token'], 'first-token')
  assert.equal(requests.at(-1).init.headers['X-Token'], 'second-token')
})


test('slot client surfaces FastAPI detail and fetches protected video blobs', async () => {
  const video = new Blob(['video'])
  const requests = []
  const client = createSlotClient({
    getToken: () => 'dashboard-token',
    fetchImpl: async (url, init = {}) => {
      requests.push({ url, init })
      if (url.endsWith('/check-topic')) {
        return jsonResponse({ detail: '검증할 수 없는 소재입니다.' }, { ok: false, status: 422 })
      }
      return { ok: true, status: 200, async blob() { return video } }
    },
  })

  await assert.rejects(
    client.checkTopic('20260810-1', { topic_input: '의심스러운 소재' }),
    /검증할 수 없는 소재입니다\./,
  )
  assert.equal(await client.fetchVideoBlob('20260810-1'), video)
  assert.equal(requests[1].url, '/api/slots/20260810-1/video')
  assert.equal(requests[1].init.headers['X-Token'], 'dashboard-token')
})


test('slot client forwards abort signals for obsolete polling requests', async () => {
  const requests = []
  const controller = new AbortController()
  const client = createSlotClient({
    getToken: () => '',
    fetchImpl: async (url, init = {}) => {
      requests.push({ url, init })
      return jsonResponse({ slots: [] })
    },
  })

  await client.listSlots('2026-08-10', { signal: controller.signal })

  assert.equal(requests[0].init.signal, controller.signal)
})
