const RECOVERY_STATES = {
  scheduled: { label: '재시도 예정', className: 'recovery-scheduled' },
  running: { label: '재시도 중', className: 'recovery-running' },
  recovered: { label: '자동 복구 완료', className: 'recovery-recovered' },
  exhausted: { label: '자동 복구 실패', className: 'recovery-exhausted' },
}


export function formatRecovery(recovery) {
  const display = RECOVERY_STATES[recovery?.status]
  if (!display) return null

  const details = [`시도 ${Number(recovery.attempts) || 0}회`]
  if (recovery.failed_stage) details.push(`실패 단계: ${recovery.failed_stage}`)
  if (recovery.next_retry_at && recovery.status === 'scheduled') {
    const retryTime = new Date(recovery.next_retry_at)
    const formatted = Number.isNaN(retryTime.getTime())
      ? recovery.next_retry_at
      : retryTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    details.push(`다음 재시도: ${formatted}`)
  }
  if (recovery.last_error) details.push(recovery.last_error)

  return { ...display, detail: details.join(' · ') }
}

