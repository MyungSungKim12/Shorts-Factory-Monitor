import { useEffect, useState } from 'react'

import { userFacingSlotError } from './slotView.js'


const FEASIBILITY_LABELS = {
  high: '높음',
  medium: '보통',
  insufficient: '자료 부족',
}

const VERIFICATION_LABELS = {
  grounded_search: '실시간 검색 검증',
  verified_cache: '검증 캐시',
  model_memory: '모델 지식',
}


export default function TopicCheckForm({ slot, actions, client, onChanged }) {
  const [topic, setTopic] = useState(slot.original_input || '')
  const [emphasis, setEmphasis] = useState('')
  const [include, setInclude] = useState(slot.include_constraints || '')
  const [exclude, setExclude] = useState(slot.exclude_constraints || '')
  const [references, setReferences] = useState(
    slot.reference_links?.length ? slot.reference_links : [''],
  )
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setTopic(slot.original_input || '')
    setEmphasis('')
    setInclude(slot.include_constraints || '')
    setExclude(slot.exclude_constraints || '')
    setReferences(slot.reference_links?.length ? slot.reference_links : [''])
  }, [slot.run_id, slot.attempt])

  const check = async event => {
    event.preventDefault()
    const cleanedReferences = references.map(value => value.trim()).filter(Boolean)
    if (!topic.trim()) {
      setError('확인할 소재를 입력해 주세요.')
      return
    }
    if (cleanedReferences.some(value => !value.startsWith('https://'))) {
      setError('참고 링크는 https:// 주소만 사용할 수 있습니다.')
      return
    }
    setPending('check')
    setError('')
    try {
      await client.checkTopic(slot.run_id, {
        topic_input: topic.trim(),
        emphasis: emphasis.trim(),
        include: include.trim(),
        exclude: exclude.trim(),
        reference_links: cleanedReferences,
      })
      await onChanged()
    } catch (requestError) {
      setError(userFacingSlotError(requestError, '소재를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.'))
    } finally {
      setPending('')
    }
  }

  const reserve = async () => {
    setPending('reserve')
    setError('')
    try {
      await client.reserve(slot.run_id)
      await onChanged()
    } catch (requestError) {
      setError(userFacingSlotError(requestError, '소재를 예약하지 못했습니다.'))
    } finally {
      setPending('')
    }
  }

  const cancel = async () => {
    if (!window.confirm('이 회차의 수동 소재 예약을 취소할까요?')) return
    setPending('cancel')
    setError('')
    try {
      await client.cancel(slot.run_id)
      await onChanged()
    } catch (requestError) {
      setError(userFacingSlotError(requestError, '예약을 취소하지 못했습니다.'))
    } finally {
      setPending('')
    }
  }

  const result = slot.check_result
  const visual = result?.visual || {}
  const canCancel = actions.canCancel && slot.mode === 'manual'
    && ['draft', 'reservable', 'needs_input', 'reserved'].includes(slot.state)

  return (
    <div className="topic-check">
      {(actions.canCheck || slot.state === 'checking') && (
        <form onSubmit={check} className="topic-form">
          <label>
            소재
            <textarea
              value={topic}
              onChange={event => setTopic(event.target.value)}
              maxLength={300}
              rows={2}
              disabled={!actions.canCheck || Boolean(pending)}
              placeholder="예: 와우 신호가 실제로 기록된 과정"
            />
          </label>
          <div className="topic-form-grid">
            <label>
              강조점 <span className="optional">선택</span>
              <input value={emphasis} onChange={event => setEmphasis(event.target.value)} maxLength={500} disabled={Boolean(pending)} />
            </label>
            <label>
              반드시 포함 <span className="optional">선택</span>
              <input value={include} onChange={event => setInclude(event.target.value)} maxLength={500} disabled={Boolean(pending)} />
            </label>
            <label>
              제외할 내용 <span className="optional">선택</span>
              <input value={exclude} onChange={event => setExclude(event.target.value)} maxLength={500} disabled={Boolean(pending)} />
            </label>
          </div>
          <fieldset className="reference-fields">
            <legend>참고 링크 <span className="optional">선택 · 최대 5개</span></legend>
            {references.map((value, index) => (
              <div className="reference-row" key={index}>
                <input
                  type="url"
                  inputMode="url"
                  aria-label={`참고 링크 ${index + 1}`}
                  value={value}
                  onChange={event => setReferences(current => current.map((item, itemIndex) => (
                    itemIndex === index ? event.target.value : item
                  )))}
                  placeholder="https://"
                  disabled={Boolean(pending)}
                />
                {references.length > 1 && (
                  <button
                    type="button"
                    className="button-quiet"
                    onClick={() => setReferences(current => current.filter((_, itemIndex) => itemIndex !== index))}
                    disabled={Boolean(pending)}
                    aria-label={`참고 링크 ${index + 1} 삭제`}
                  >삭제</button>
                )}
              </div>
            ))}
            {references.length < 5 && (
              <button type="button" className="button-quiet add-reference" onClick={() => setReferences(current => [...current, ''])} disabled={Boolean(pending)}>
                + 링크 추가
              </button>
            )}
          </fieldset>
          <button type="submit" className="button-primary" disabled={!actions.canCheck || Boolean(pending)}>
            {pending === 'check' || slot.state === 'checking' ? '소재 확인 중…' : '소재 확인'}
          </button>
        </form>
      )}

      {result?.status === 'needs_input' && result.interpretations?.length > 0 && (
        <div className="interpretation-box">
          <strong>어떤 의미인지 선택해 주세요</strong>
          <div className="choice-list">
            {result.interpretations.map(choice => (
              <button type="button" className="choice-button" key={choice} onClick={() => setTopic(choice)} disabled={Boolean(pending)}>
                {choice}
              </button>
            ))}
          </div>
          <p className="slot-muted">선택한 뒤 ‘소재 확인’을 다시 눌러 주세요.</p>
        </div>
      )}

      {result?.normalized_topic && (
        <div className="topic-preview">
          <h4>소재 확인 결과</h4>
          <dl className="slot-facts">
            <div><dt>정규화 소재</dt><dd>{result.normalized_topic}</dd></div>
            <div><dt>핵심 질문</dt><dd>{result.core_question || '확인 중'}</dd></div>
            <div><dt>검증 방식</dt><dd>{VERIFICATION_LABELS[result.verification_method] || '확인 필요'}</dd></div>
            <div><dt>미디어 가능성</dt><dd>{FEASIBILITY_LABELS[visual.level] || '확인 필요'}</dd></div>
            <div><dt>정확 자료</dt><dd>{visual.exact_wikimedia_count || 0}개</dd></div>
            <div><dt>스톡 자료</dt><dd>{visual.related_stock_count || 0}개</dd></div>
            <div><dt>재사용 AI</dt><dd>{visual.reusable_ai_count || 0}개</dd></div>
            <div><dt>새 AI 생성</dt><dd>{visual.new_ai_allowed ? '가능' : '사용 안 함'}</dd></div>
          </dl>
          {result.channel_warning && (
            <p className="slot-warning">채널의 기존 방향과 차이가 있습니다. 예약 전에 소재 톤을 다시 확인해 주세요.</p>
          )}
        </div>
      )}

      {error && <p className="slot-inline-error" role="alert">{error}</p>}
      <div className="slot-button-row">
        {actions.canReserve && (
          <button type="button" className="button-primary" onClick={reserve} disabled={Boolean(pending)}>
            {pending === 'reserve' ? '예약 중…' : '이 소재 예약'}
          </button>
        )}
        {canCancel && (
          <button type="button" className="button-quiet" onClick={cancel} disabled={Boolean(pending)}>
            {pending === 'cancel' ? '취소 중…' : '수동 예약 취소'}
          </button>
        )}
      </div>
    </div>
  )
}
