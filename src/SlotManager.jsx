import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createSlotClient } from './slotApi.js'
import SlotCard from './SlotCard.jsx'
import { slotDateKeys, slotPollDelay, userFacingSlotError } from './slotView.js'


const TOKEN_KEY = 'shorts-factory-dashboard-token'


function savedToken() {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}


export default function SlotManager() {
  const [dates, setDates] = useState(() => slotDateKeys())
  const [selectedDate, setSelectedDate] = useState(() => slotDateKeys()[0])
  const [slotsByDate, setSlotsByDate] = useState({})
  const [token, setToken] = useState(savedToken)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const tokenRef = useRef(token)
  const requestController = useRef(null)
  const inFlight = useRef(null)
  const refreshQueued = useRef(false)
  const datesRef = useRef(dates)
  const mounted = useRef(true)
  const dateKey = dates.join('|')
  datesRef.current = dates

  useEffect(() => {
    tokenRef.current = token
    try {
      if (token) window.sessionStorage.setItem(TOKEN_KEY, token)
      else window.sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      // The dashboard still works in read-only mode when storage is unavailable.
    }
  }, [token])

  const client = useMemo(() => createSlotClient({
    getToken: () => tokenRef.current,
  }), [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      requestController.current?.abort()
    }
  }, [])

  const loadSlots = useCallback(async () => {
    if (inFlight.current) {
      refreshQueued.current = true
      return inFlight.current.catch(() => undefined)
    }
    const controller = new AbortController()
    requestController.current = controller
    setError('')
    const requestedDates = datesRef.current
    const request = Promise.all(requestedDates.map(date => (
        client.listSlots(date, { signal: controller.signal })
    )))
    inFlight.current = request
    try {
      const payloads = await request
      if (controller.signal.aborted) return
      setSlotsByDate(Object.fromEntries(payloads.map((payload, index) => [
        requestedDates[index],
        Array.isArray(payload?.slots) ? payload.slots : [],
      ])))
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') {
        setError(userFacingSlotError(requestError, '회차 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'))
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
      if (inFlight.current === request) {
        inFlight.current = null
        if (refreshQueued.current && mounted.current) {
          refreshQueued.current = false
          window.setTimeout(() => {
            if (mounted.current) loadSlots()
          }, 0)
        }
      }
    }
  }, [client])

  useEffect(() => {
    requestController.current?.abort()
    inFlight.current = null
    refreshQueued.current = false
    loadSlots()
    return () => {
      requestController.current?.abort()
    }
  }, [dateKey, loadSlots])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextDates = slotDateKeys()
      setDates(current => current.join('|') === nextDates.join('|') ? current : nextDates)
    }, 30000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!dates.includes(selectedDate)) setSelectedDate(dates[0])
  }, [dates, selectedDate])

  const allSlots = Object.values(slotsByDate).flat()
  const pollDelay = slotPollDelay(allSlots)

  useEffect(() => {
    let cancelled = false
    let timer = window.setTimeout(async function poll() {
      await loadSlots()
      if (!cancelled) timer = window.setTimeout(poll, pollDelay)
    }, pollDelay)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [loadSlots, pollDelay])

  const slots = slotsByDate[selectedDate] || []

  return (
    <section className="card slot-manager" aria-labelledby="slot-manager-title">
      <div className="slot-manager-heading">
        <div>
          <h2 id="slot-manager-title">회차별 제작 관리</h2>
          <p className="slot-manager-help">소재를 먼저 확인한 뒤, 예약 버튼을 눌러야 해당 회차에 반영됩니다.</p>
        </div>
        <label className="token-field">
          관리자 토큰
          <input
            type="password"
            value={token}
            onChange={event => setToken(event.target.value)}
            autoComplete="new-password"
            placeholder="변경 작업에 필요"
          />
        </label>
      </div>

      <div className="slot-toolbar">
        <div className="date-tabs" aria-label="회차 날짜">
          {dates.map((date, index) => (
            <button
              type="button"
              aria-pressed={selectedDate === date}
              className={selectedDate === date ? 'active' : ''}
              key={date}
              onClick={() => setSelectedDate(date)}
            >
              {index === 0 ? '오늘' : '내일'} <span>{date}</span>
            </button>
          ))}
        </div>
        <button type="button" className="button-quiet" onClick={loadSlots} disabled={loading}>
          {loading ? '불러오는 중…' : '회차 새로고침'}
        </button>
      </div>

      {error && <p className="slot-manager-error" role="alert">{error}</p>}
      {loading && !slots.length ? (
        <p className="slot-empty">회차 정보를 불러오는 중입니다.</p>
      ) : slots.length ? (
        <div className="slot-grid">
          {slots.map(slot => (
            <SlotCard key={slot.run_id} slot={slot} client={client} onChanged={loadSlots} />
          ))}
        </div>
      ) : (
        <p className="slot-empty">표시할 회차가 없습니다. 잠시 후 다시 시도해 주세요.</p>
      )}
    </section>
  )
}
