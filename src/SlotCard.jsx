import { useEffect, useState } from 'react'

import SlotEvents from './SlotEvents.jsx'
import SlotReview from './SlotReview.jsx'
import TopicCheckForm from './TopicCheckForm.jsx'
import { formatCountdown, shouldPollFast, slotActions, slotProgress } from './slotState.js'
import { formatKstDateTime, userFacingSlotError } from './slotView.js'


const STATE_LABELS = {
  auto: '자동 소재 대기',
  draft: '입력 대기',
  checking: '소재 확인 중',
  reservable: '예약 가능',
  needs_input: '추가 입력 필요',
  reserved: '예약 완료',
  locked: '작업 시작',
  researching: '리서치 중',
  writing: '대본 작성 중',
  producing: '영상 제작 중',
  quality_check: '품질 검수 중',
  review_ready: '검토 준비 완료',
  held: '승인 대기',
  approved: '승인 완료',
  uploading: '업로드 중',
  uploaded: '업로드 완료',
  failed: '제작 실패',
  rejected: '반려됨',
  cancelled: '예약 취소',
  skipped: '회차 건너뜀',
}

const FAILURE_REASONS = {
  topic_check_failed: '소재 사전 검사 중 오류가 발생했습니다.',
  safety_invalid: '소재 안전성 정보를 확인하지 못했습니다.',
  safety_rejected: '안전성 기준에 따라 이 소재를 사용할 수 없습니다.',
  grounding_invalid: '사실 검증 조건을 충족하지 못했습니다.',
  visual_insufficient: '사용 가능한 시각 자료가 부족합니다.',
}


export default function SlotCard({ slot, client, onChanged }) {
  const [now, setNow] = useState(() => new Date())
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const actions = slotActions(slot, now)
  const progress = slotProgress(slot.state)
  const stateLabel = STATE_LABELS[slot.state] || progress.label
  const failedReason = slot.rejection_reason
    || FAILURE_REASONS[slot.check_result?.reason]
    || (slot.state === 'failed' ? '작업을 완료하지 못했습니다. 최근 로그를 확인해 주세요.' : '')

  const act = async (name, message, action) => {
    if (!window.confirm(message)) return
    setPending(name)
    setError('')
    try {
      await action()
      await onChanged()
    } catch (requestError) {
      setError(userFacingSlotError(requestError))
    } finally {
      setPending('')
    }
  }

  return (
    <article className={`slot-card slot-state-${slot.state}`}>
      <div className="slot-card-heading">
        <div>
          <span className="slot-number">{slot.slot}회차</span>
          <h3>{formatKstDateTime(slot.upload_at)} 업로드</h3>
        </div>
        <div className="slot-badges">
          <span className={`mode-badge mode-${slot.mode}`}>{slot.mode === 'manual' ? '수동' : '자동'}</span>
          <span className={`state-badge state-${slot.state}`}>{stateLabel}</span>
        </div>
      </div>

      <dl className="slot-times">
        <div><dt>제작 시작</dt><dd>{formatKstDateTime(slot.production_at)} KST</dd></div>
        <div><dt>업로드</dt><dd>{formatKstDateTime(slot.upload_at)} KST</dd></div>
        <div><dt>입력 마감</dt><dd className={slot.input_open ? 'countdown-open' : 'countdown-closed'}>{formatCountdown(slot.production_at, now)}</dd></div>
      </dl>

      <div className="slot-topic-summary">
        <span>예약 소재</span>
        <strong>{slot.normalized_topic || slot.original_input || '자동으로 소재를 선정합니다.'}</strong>
      </div>

      <div className="slot-progress" aria-label={`진행률 ${progress.percent}%`}>
        <div className="slot-progress-label"><span>{stateLabel}</span><span>{progress.percent}%</span></div>
        <div className="slot-progress-track"><span style={{ width: `${progress.percent}%` }} /></div>
      </div>

      {(slot.state === 'failed' || slot.state === 'rejected') && (
        <div className="slot-failure" role="status">
          <strong>{slot.state === 'rejected' ? '반려 사유' : '처리하지 못한 이유'}</strong>
          <p>{failedReason}</p>
        </div>
      )}

      {error && <p className="slot-inline-error" role="alert">{error}</p>}

      {(actions.canRetry || actions.canSkip) && (
        <div className="slot-button-row failure-actions">
          {actions.canRetry && (
            <>
              <button
                type="button"
                className="button-primary"
                disabled={Boolean(pending)}
                onClick={() => act('same', '검증된 같은 소재로 제작을 다시 시도할까요?', () => client.retry(slot.run_id, 'same_topic'))}
              >{pending === 'same' ? '재시도 중…' : '같은 소재로 재시도'}</button>
              <button
                type="button"
                className="button-quiet"
                disabled={Boolean(pending)}
                onClick={() => act('new', '소재 확인 단계부터 다시 시작할까요?', () => client.retry(slot.run_id, 'new_topic'))}
              >{pending === 'new' ? '재검증 중…' : '소재 다시 검증'}</button>
            </>
          )}
          {actions.canSkip && (
            <button
              type="button"
              className="button-danger"
              disabled={Boolean(pending)}
              onClick={() => act('skip', '이번 회차를 업로드 없이 건너뛸까요?', () => client.skip(slot.run_id))}
            >{pending === 'skip' ? '처리 중…' : '이번 회차 건너뛰기'}</button>
          )}
        </div>
      )}

      <TopicCheckForm slot={slot} actions={actions} client={client} onChanged={onChanged} />

      {slot.mode === 'manual' ? (
        <SlotEvents client={client} runId={slot.run_id} fast={shouldPollFast(slot)} />
      ) : (
        <p className="slot-muted auto-log-note">수동 소재를 확인하면 이곳에 진행 로그가 표시됩니다.</p>
      )}

      {['review_ready', 'held'].includes(slot.state) && (
        <SlotReview slot={slot} client={client} onChanged={onChanged} />
      )}
    </article>
  )
}
