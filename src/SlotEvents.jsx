import { useEffect, useRef, useState } from 'react'

import { formatEventTime, mergeSlotEvents, userFacingSlotError } from './slotView.js'


export default function SlotEvents({ client, runId, fast = false, pollable = true }) {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const lastId = useRef(0)

  useEffect(() => {
    if (!pollable) {
      lastId.current = 0
      setEvents([])
      setError('')
      return undefined
    }
    let active = true
    let timer
    let controller
    lastId.current = 0
    setEvents([])
    setError('')

    const poll = async () => {
      controller?.abort()
      controller = new AbortController()
      try {
        const payload = await client.events(runId, lastId.current, 100, {
          signal: controller.signal,
        })
        if (!active) return
        const incoming = Array.isArray(payload?.events) ? payload.events : []
        setEvents(current => mergeSlotEvents(current, incoming))
        if (incoming.length) {
          lastId.current = Math.max(lastId.current, ...incoming.map(event => event.id || 0))
        }
        setError('')
      } catch (requestError) {
        if (active && requestError?.name !== 'AbortError') {
          setError(userFacingSlotError(requestError, '진행 로그를 불러오지 못했습니다.'))
        }
      } finally {
        if (active) timer = window.setTimeout(poll, fast ? 2000 : 30000)
      }
    }

    poll()
    return () => {
      active = false
      window.clearTimeout(timer)
      controller?.abort()
    }
  }, [client, fast, pollable, runId])

  const recent = events.slice(-3)

  return (
    <div className="slot-events" aria-live="polite">
      <h4>최근 진행 로그</h4>
      {error && <p className="slot-inline-error">{error}</p>}
      {recent.length ? (
        <ol className="event-list event-list-recent">
          {recent.map(event => <EventLine key={event.id} event={event} />)}
        </ol>
      ) : (
        <p className="slot-muted">아직 기록된 진행 로그가 없습니다.</p>
      )}
      {events.length > 3 && (
        <details className="event-details">
          <summary>전체 로그 {events.length}건 보기</summary>
          <div className="event-log-pane">
            <ol className="event-list">
              {events.map(event => <EventLine key={event.id} event={event} />)}
            </ol>
          </div>
        </details>
      )}
    </div>
  )
}


function EventLine({ event }) {
  return (
    <li className={`event-line event-${event.level || 'info'}`}>
      <time dateTime={event.created_at || undefined}>{formatEventTime(event.created_at)}</time>
      <span>{event.message || '진행 상태가 갱신되었습니다.'}</span>
    </li>
  )
}
