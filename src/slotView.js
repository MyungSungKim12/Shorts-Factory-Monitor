import { shouldPollFast } from './slotState.js'


const KST_TIME_ZONE = 'Asia/Seoul'


function dateKeyInKst(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}


export function slotDateKeys(now = new Date()) {
  return [dateKeyInKst(now), dateKeyInKst(new Date(now.getTime() + 86_400_000))]
}


export function mergeSlotEvents(current, incoming) {
  const events = new Map()
  for (const event of [...(current || []), ...(incoming || [])]) {
    if (Number.isInteger(event?.id) && !events.has(event.id)) events.set(event.id, event)
  }
  return [...events.values()].sort((left, right) => left.id - right.id)
}


export function slotPollDelay(slots) {
  return (slots || []).some(shouldPollFast) ? 2000 : 30000
}


export function actualSourceFacts(summary) {
  const types = summary?.types && typeof summary.types === 'object'
    ? Object.entries(summary.types)
      .filter(([, count]) => Number.isInteger(count) && count >= 0)
      .map(([type, count]) => `${type} ${count}`)
      .join(', ')
    : ''
  return {
    itemCount: Number.isInteger(summary?.item_count) ? summary.item_count : 0,
    uniqueCount: Number.isInteger(summary?.unique_source_count)
      ? summary.unique_source_count
      : 0,
    typeLabel: types,
    urls: Array.isArray(summary?.public_urls)
      ? summary.public_urls.filter(value => typeof value === 'string')
      : [],
  }
}


export function userFacingSlotError(error, fallback = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.') {
  const messages = {
    401: '관리자 토큰을 확인해 주세요.',
    404: '해당 회차 또는 영상 정보를 찾을 수 없습니다.',
    409: '회차 상태가 변경되었습니다. 새로고침 후 다시 시도해 주세요.',
    422: '입력 내용과 회차 마감 시간을 확인해 주세요.',
    503: '관리자 기능이 아직 설정되지 않았습니다.',
  }
  return messages[error?.status] || fallback
}


export function formatKstDateTime(value) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '시간 미정'
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST_TIME_ZONE,
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.month} ${values.day}일 ${values.hour}:${values.minute}`
}


export function formatEventTime(value) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}
