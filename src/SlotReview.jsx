import { useEffect, useState } from 'react'

import { slotActions } from './slotState.js'
import { userFacingSlotError } from './slotView.js'


export default function SlotReview({ slot, client, onChanged }) {
  const [detail, setDetail] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pending, setPending] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let objectUrl = ''
    let active = true
    setDetail(null)
    setVideoUrl('')
    setLoading(true)
    setError('')

    const load = async () => {
      const [detailResult, videoResult] = await Promise.allSettled([
        client.getSlot(slot.run_id, { signal: controller.signal }),
        client.fetchVideoBlob(slot.run_id, { signal: controller.signal }),
      ])
      if (!active) return
      if (detailResult.status === 'fulfilled') setDetail(detailResult.value)
      if (videoResult.status === 'fulfilled') {
        objectUrl = URL.createObjectURL(videoResult.value)
        setVideoUrl(objectUrl)
      } else if (videoResult.reason?.name !== 'AbortError') {
        setError(userFacingSlotError(videoResult.reason, '검토 영상을 불러오지 못했습니다.'))
      }
      if (detailResult.status === 'rejected' && detailResult.reason?.name !== 'AbortError') {
        setError(userFacingSlotError(detailResult.reason, '영상 정보를 불러오지 못했습니다.'))
      }
      setLoading(false)
    }

    load()
    return () => {
      active = false
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [client, slot.run_id, slot.state])

  const runAction = async (name, confirmMessage, action) => {
    if (!window.confirm(confirmMessage)) return
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

  const reject = async () => {
    const reason = window.prompt('반려 이유를 입력해 주세요. (최대 300자)')
    if (reason === null) return
    const cleaned = reason.trim().slice(0, 300)
    if (!cleaned) {
      setError('반려 이유를 입력해 주세요.')
      return
    }
    await runAction('reject', '이 영상을 반려하고 결과물을 보관 처리할까요?', () => (
      client.reject(slot.run_id, cleaned)
    ))
  }

  const actions = slotActions(slot)
  const review = detail?.review || {}
  const script = review.script || {}
  const quality = review.package?.quality_gate || {}
  const report = quality.report || {}
  const visual = slot.check_result?.visual || {}

  return (
    <section className="slot-review" aria-label={`${slot.slot}회차 영상 검토`}>
      <h4>최종 영상 검토</h4>
      {loading && <p className="slot-muted">영상과 검토 정보를 불러오는 중입니다.</p>}
      {videoUrl && (
        <video className="review-video" src={videoUrl} controls playsInline preload="metadata">
          이 브라우저에서는 영상 미리보기를 지원하지 않습니다.
        </video>
      )}
      {error && <p className="slot-inline-error" role="alert">{error}</p>}

      {script.title && (
        <div className="review-metadata">
          <h3>{script.title}</h3>
          {script.description && <p>{script.description}</p>}
          {script.tags?.length > 0 && (
            <p className="review-tags">{script.tags.map(tag => `#${tag}`).join(' ')}</p>
          )}
          <dl className="slot-facts">
            <div><dt>검증 방식</dt><dd>{slot.check_result?.verification_method || '확인 필요'}</dd></div>
            <div><dt>AI 자료</dt><dd>{visual.reusable_ai_count || 0}개</dd></div>
            <div><dt>스톡 자료</dt><dd>{visual.related_stock_count || 0}개</dd></div>
            <div><dt>QC</dt><dd>{quality.passed ? '통과' : '확인 필요'}</dd></div>
            <div><dt>영상</dt><dd>{report.width && report.height ? `${report.width}×${report.height}` : '확인 중'}</dd></div>
            <div><dt>길이</dt><dd>{Number.isFinite(report.duration) ? `${report.duration}초` : '확인 중'}</dd></div>
          </dl>
          {quality.failures?.length > 0 && (
            <p className="slot-warning">QC 확인 항목: {quality.failures.join(', ')}</p>
          )}
          {script.scenes?.length > 0 && (
            <details className="scene-details">
              <summary>대본 장면 {script.scenes.length}개 보기</summary>
              <ol>
                {script.scenes.map((scene, index) => (
                  <li key={scene.n || index}>{scene.narration || '장면 설명 없음'}</li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}

      <div className="slot-button-row review-actions">
        {actions.canApprove && (
          <button
            type="button"
            className="button-success"
            onClick={() => runAction('approve', '이 영상을 승인하고 예정 시각에 업로드할까요?', () => client.approve(slot.run_id))}
            disabled={Boolean(pending)}
          >
            {pending === 'approve' ? '승인 중…' : '승인'}
          </button>
        )}
        {actions.canReject && (
          <button type="button" className="button-danger" onClick={reject} disabled={Boolean(pending)}>
            {pending === 'reject' ? '반려 중…' : '반려'}
          </button>
        )}
      </div>
    </section>
  )
}
