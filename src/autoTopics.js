const STATUS_LABELS = {
  prepared: '제작 완료 · 업로드 대기',
  uploaded: '업로드 완료',
}


export function autoTopicStatus(status) {
  return STATUS_LABELS[status] || '상태 확인 필요'
}
