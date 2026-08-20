const CATEGORY_LABELS = {
  hidden_world: '숨겨진 세계',
  science_mystery: '과학 미스터리',
  history_mystery: '역사 미스터리',
  place_nature: '기묘한 장소',
  unknown: '미분류',
}

export function formatNumber(value, suffix = '') {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return `${Math.round(value).toLocaleString('ko-KR')}${suffix}`
}

export function formatRatio(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  const percent = value <= 1 ? value * 100 : value
  return `${Math.round(percent)}%`
}

export function performanceStatusLabel(collection = {}) {
  if (collection.status === 'success') return '수집 정상'
  if (collection.status === 'partial') return '일부 수집'
  if (collection.status === 'failed') return '수집 실패'
  return '수집 대기'
}

export function performanceStatusClass(collection = {}) {
  if (collection.status === 'success') return 'ok-text'
  if (collection.status === 'partial') return 'warn-text'
  if (collection.status === 'failed') return 'err-text'
  return 'dim'
}

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category || CATEGORY_LABELS.unknown
}
