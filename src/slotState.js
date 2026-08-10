const ACTIVE_STATES = new Set([
  'checking', 'locked', 'researching', 'writing',
  'producing', 'quality_check', 'uploading',
])

const EDITABLE_STATES = new Set([
  'auto', 'draft', 'reservable', 'needs_input', 'reserved',
  'cancelled',
])

const CHECKABLE_STATES = new Set([
  'auto', 'draft', 'reservable', 'needs_input', 'cancelled',
])

const REVIEW_STATES = new Set(['review_ready', 'held'])
const RETRYABLE_STATES = new Set(['failed', 'rejected'])

const PROGRESS = [
  ['checking', '소재 검증 중'],
  ['reservable', '예약 가능'],
  ['reserved', '예약 완료'],
  ['locked', '작업 시작'],
  ['researching', '리서치 중'],
  ['writing', '대본 작성 중'],
  ['producing', '영상 제작 중'],
  ['quality_check', '품질 검수 중'],
  ['review_ready', '검토 대기'],
  ['held', '승인 대기'],
  ['approved', '승인 완료'],
  ['uploading', '업로드 중'],
  ['uploaded', '업로드 완료'],
]


function isInputOpen(slot, now) {
  if (typeof slot?.input_open === 'boolean') return slot.input_open
  const cutoff = Date.parse(slot?.production_at)
  return Number.isFinite(cutoff) && now.getTime() < cutoff
}


export function slotActions(slot, now = new Date()) {
  const state = slot?.state
  const idle = slot?.worker_id == null
  const inputOpen = isInputOpen(slot, now)
  const replacementFlow = slot?.replacement_allowed === true
    && ['draft', 'reservable', 'needs_input'].includes(state)
  const reviewReady = idle && REVIEW_STATES.has(state)
  const retryable = idle && RETRYABLE_STATES.has(state)

  return {
    canCheck: idle && (inputOpen || replacementFlow) && CHECKABLE_STATES.has(state),
    canEdit: idle && (inputOpen || replacementFlow) && EDITABLE_STATES.has(state),
    canReserve: idle && state === 'reservable' && (inputOpen || replacementFlow),
    canCancel: idle && inputOpen && EDITABLE_STATES.has(state),
    canApprove: reviewReady,
    canReject: reviewReady,
    canRetry: retryable,
    canSkip: retryable,
  }
}


export function slotProgress(state) {
  const index = PROGRESS.findIndex(([name]) => name === state) + 1
  const total = PROGRESS.length
  const label = index ? PROGRESS[index - 1][1] : '상태 확인 필요'

  return {
    index,
    total,
    percent: index ? Math.round(index / total * 100) : 0,
    label,
  }
}


export function formatCountdown(productionAt, now = new Date()) {
  const cutoff = Date.parse(productionAt)
  if (!Number.isFinite(cutoff)) return '시간 미정'

  const remainingMinutes = Math.ceil((cutoff - now.getTime()) / 60_000)
  if (remainingMinutes <= 0) return '마감됨'

  const days = Math.floor(remainingMinutes / (24 * 60))
  const hours = Math.floor(remainingMinutes % (24 * 60) / 60)
  const minutes = remainingMinutes % 60
  if (days) return `${days}일 ${hours}시간 ${String(minutes).padStart(2, '0')}분`
  if (hours) return `${hours}시간 ${String(minutes).padStart(2, '0')}분`
  return `${minutes}분`
}


export function shouldPollFast(slot) {
  return ACTIVE_STATES.has(slot?.state) || slot?.state === 'review_ready' || slot?.state === 'held'
}
