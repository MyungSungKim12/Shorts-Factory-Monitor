import { useCallback, useEffect, useRef, useState } from 'react'

import Pagination from './Pagination.jsx'
import SlotManager from './SlotManager.jsx'
import { autoTopicStatus } from './autoTopics.js'
import { normalizePage } from './pagination.js'
import {
  categoryLabel,
  formatNumber,
  formatRatio,
  performanceStatusClass,
  performanceStatusLabel,
} from './performanceInsights.js'
import { formatRecovery } from './recovery.js'


const STAGE_LABELS = {
  researcher: '① 소재 리서치',
  writer: '② 대본 작성',
  producer: '③ 영상 제작',
  uploader: '④ 업로드',
}

const EMPTY_PAGINATION = {
  page: 1,
  page_size: 10,
  total_items: 0,
  total_pages: 0,
  has_previous: false,
  has_next: false,
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

function StageChip({ name, info }) {
  const status = info?.status || 'pending'
  const cls = { success: 'ok', uploaded: 'ok', skipped: 'skip', error: 'err' }[status] || 'wait'
  const label = { success: '완료', uploaded: '완료', skipped: '건너뜀', error: '실패' }[status] || '대기'
  return (
    <div className={`stage ${cls}`}>
      <span className="stage-name">{STAGE_LABELS[name] || name}</span>
      <span className="stage-status">{label}</span>
    </div>
  )
}

function RecoveryStatus({ recovery }) {
  const formatted = formatRecovery(recovery)
  if (!formatted) return null
  return (
    <div className="recovery-status">
      <span className={`recovery-badge ${formatted.className}`}>{formatted.label}</span>
      <span className="recovery-detail">{formatted.detail}</span>
    </div>
  )
}

export default function App() {
  const [health, setHealth] = useState(null)
  const [status, setStatus] = useState(null)
  const [report, setReport] = useState(null)
  const [performance, setPerformance] = useState(null)
  const [performanceError, setPerformanceError] = useState('')
  const [lastSync, setLastSync] = useState(null)

  const [videos, setVideos] = useState([])
  const [videoPage, setVideoPage] = useState(1)
  const [videoPagination, setVideoPagination] = useState(EMPTY_PAGINATION)
  const [videoLoading, setVideoLoading] = useState(true)
  const [videoError, setVideoError] = useState('')

  const [runs, setRuns] = useState([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPagination, setHistoryPagination] = useState(EMPTY_PAGINATION)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')

  const [autoTopics, setAutoTopics] = useState([])
  const [autoTopicPage, setAutoTopicPage] = useState(1)
  const [autoTopicPagination, setAutoTopicPagination] = useState(EMPTY_PAGINATION)
  const [autoTopicLoading, setAutoTopicLoading] = useState(true)
  const [autoTopicError, setAutoTopicError] = useState('')

  const videoRequest = useRef(0)
  const historyRequest = useRef(0)
  const autoTopicRequest = useRef(0)

  const loadOverview = useCallback(async () => {
    const [healthResult, statusResult, reportResult, performanceResult] = await Promise.allSettled([
      fetchJson('/api/health'),
      fetchJson('/api/status'),
      fetchJson('/api/report'),
      fetchJson('/api/performance-summary'),
    ])
    setHealth(healthResult.status === 'fulfilled' ? healthResult.value : null)
    if (statusResult.status === 'fulfilled') setStatus(statusResult.value)
    if (reportResult.status === 'fulfilled') setReport(reportResult.value)
    if (performanceResult.status === 'fulfilled') {
      setPerformance(performanceResult.value)
      setPerformanceError('')
    } else {
      const message = performanceResult.reason?.message || '알 수 없는 오류'
      setPerformanceError(`성과 인사이트를 불러오지 못했습니다. (${message})`)
    }
    setLastSync(new Date().toLocaleTimeString('ko-KR'))
  }, [])

  const loadVideos = useCallback(async page => {
    const requestId = ++videoRequest.current
    setVideoLoading(true)
    setVideoError('')
    try {
      const data = await fetchJson(`/api/videos?page=${page}&page_size=10`)
      if (requestId !== videoRequest.current) return
      const pagination = data.pagination || EMPTY_PAGINATION
      const validPage = normalizePage(page, pagination.total_pages)
      if (validPage !== page) {
        setVideoPage(validPage)
        return
      }
      setVideos(data.videos || [])
      setVideoPagination(pagination)
    } catch (error) {
      if (requestId === videoRequest.current) {
        setVideoError(`영상 목록을 불러오지 못했습니다. (${error.message})`)
      }
    } finally {
      if (requestId === videoRequest.current) setVideoLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async page => {
    const requestId = ++historyRequest.current
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const data = await fetchJson(`/api/history?page=${page}&page_size=10`)
      if (requestId !== historyRequest.current) return
      const pagination = data.pagination || EMPTY_PAGINATION
      const validPage = normalizePage(page, pagination.total_pages)
      if (validPage !== page) {
        setHistoryPage(validPage)
        return
      }
      setRuns(data.runs || [])
      setHistoryPagination(pagination)
    } catch (error) {
      if (requestId === historyRequest.current) {
        setHistoryError(`실행 이력을 불러오지 못했습니다. (${error.message})`)
      }
    } finally {
      if (requestId === historyRequest.current) setHistoryLoading(false)
    }
  }, [])

  const loadAutoTopics = useCallback(async page => {
    const requestId = ++autoTopicRequest.current
    setAutoTopicLoading(true)
    setAutoTopicError('')
    try {
      const data = await fetchJson(`/api/auto-topics?page=${page}&page_size=10`)
      if (requestId !== autoTopicRequest.current) return
      const pagination = data.pagination || EMPTY_PAGINATION
      const validPage = normalizePage(page, pagination.total_pages)
      if (validPage !== page) {
        setAutoTopicPage(validPage)
        return
      }
      setAutoTopics(data.topics || [])
      setAutoTopicPagination(pagination)
    } catch (error) {
      if (requestId === autoTopicRequest.current) {
        setAutoTopicError(`자동 소재 이력을 불러오지 못했습니다. (${error.message})`)
      }
    } finally {
      if (requestId === autoTopicRequest.current) setAutoTopicLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  useEffect(() => {
    loadVideos(videoPage)
  }, [loadVideos, videoPage])

  useEffect(() => {
    loadHistory(historyPage)
  }, [historyPage, loadHistory])

  useEffect(() => {
    loadAutoTopics(autoTopicPage)
  }, [autoTopicPage, loadAutoTopics])

  useEffect(() => {
    const timer = setInterval(() => {
      loadOverview()
      loadVideos(videoPage)
      loadHistory(historyPage)
      loadAutoTopics(autoTopicPage)
    }, 30000)
    return () => clearInterval(timer)
  }, [autoTopicPage, historyPage, loadAutoTopics, loadHistory, loadOverview, loadVideos, videoPage])

  const refreshAll = () => {
    loadOverview()
    loadVideos(videoPage)
    loadHistory(historyPage)
    loadAutoTopics(autoTopicPage)
  }

  const serverUp = health?.status === 'ok'
  const pipelineRunning = health?.running

  return (
    <div className="container">
      <header>
        <div>
          <h1>🎬 Shorts Factory</h1>
          <p>매일 11:00·14:00·17:00·21:00 자동 실행 · 30초마다 자동 갱신 {lastSync && `(마지막 ${lastSync})`}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="refresh-button" onClick={refreshAll}>새로고침</button>
          <div className={`server-badge ${serverUp ? 'up' : 'down'}`}>
            {serverUp ? (pipelineRunning ? '🟡 파이프라인 실행 중' : '🟢 서버 정상') : '🔴 서버 연결 안 됨'}
          </div>
        </div>
      </header>

      <SlotManager />

      <section className="card">
        <div className="card-heading-row">
          <h2>장기 성과 인사이트</h2>
          <span className={performanceStatusClass(performance?.collection)}>
            {performanceStatusLabel(performance?.collection)}
          </span>
        </div>
        {performanceError && <p className="list-error">{performanceError}</p>}
        {!performanceError && !performance?.available ? (
          <p className="dim">{performance?.message || '성과 수집 리포트를 기다리는 중입니다.'}</p>
        ) : performance?.available ? (
          <>
            <div className="metric-grid">
              <div className="metric-card">
                <span>분석 영상</span>
                <strong>{formatNumber(performance.summary?.total_videos, '개')}</strong>
              </div>
              <div className="metric-card">
                <span>중앙 조회수</span>
                <strong>{formatNumber(performance.summary?.median_views, '회')}</strong>
              </div>
              <div className="metric-card">
                <span>참여 조회율</span>
                <strong>{formatRatio(performance.summary?.median_engaged_view_rate)}</strong>
              </div>
              <div className="metric-card">
                <span>평균 시청 유지</span>
                <strong>{formatRatio(performance.summary?.median_average_view_percentage)}</strong>
              </div>
            </div>

            {performance.top_categories?.length > 0 && (
              <div className="insight-section">
                <h3>상위 카테고리</h3>
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>카테고리</th><th>영상</th><th>중앙 조회수</th><th>시청 유지</th></tr></thead>
                    <tbody>
                      {performance.top_categories.map(item => (
                        <tr key={item.category}>
                          <td>{categoryLabel(item.category)}</td>
                          <td className="dim">{formatNumber(item.videos, '개')}</td>
                          <td>{formatNumber(item.median_views, '회')}</td>
                          <td className="dim">{formatRatio(item.median_average_view_percentage)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {performance.top_videos?.length > 0 && (
              <div className="insight-section">
                <h3>성과 상위 영상</h3>
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>회차</th><th>제목</th><th>조회수</th><th>유지율</th></tr></thead>
                    <tbody>
                      {performance.top_videos.map(video => (
                        <tr key={`${video.run_id}-${video.video_id}`}>
                          <td className="dim">{video.run_id || '-'}</td>
                          <td>{video.url ? <a href={video.url} target="_blank" rel="noreferrer">{video.title}</a> : video.title}</td>
                          <td>{formatNumber(video.views, '회')}</td>
                          <td className="dim">{formatRatio(video.average_view_percentage)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {performance.watch_items?.length > 0 && (
              <div className="insight-section">
                <h3>주의 소재</h3>
                <ul className="watch-list">
                  {performance.watch_items.map(item => (
                    <li key={item.run_id}>
                      <span className="dim">{item.run_id}</span>
                      <strong>{item.title || '제목 없음'}</strong>
                      <span className="err-text">{formatNumber(item.views, '회')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {performance.warnings?.length > 0 && (
              <ul className="warning-list">
                {performance.warnings.map(warning => <li key={warning}>{warning}</li>)}
              </ul>
            )}

            {performance.generated_at && (
              <p className="dim report-time">성과 갱신: {new Date(performance.generated_at).toLocaleString('ko-KR')}</p>
            )}
          </>
        ) : (
          <p className="dim">성과 인사이트를 불러오는 중입니다.</p>
        )}
      </section>

      <section className="card">
        <h2>자동 생성 소재 히스토리 <span className="dim">({autoTopicPagination.total_items}건)</span></h2>
        {autoTopicError && <p className="list-error">{autoTopicError}</p>}
        {autoTopicLoading && !autoTopics.length ? (
          <p className="dim">자동 생성 소재를 불러오는 중입니다.</p>
        ) : autoTopics.length ? (
          <div className="table-scroll">
            <table>
              <thead><tr><th>회차</th><th>소재</th><th>영상 제목</th><th>상태</th><th>생성 시각</th></tr></thead>
              <tbody>
                {autoTopics.map(item => (
                  <tr key={item.run_id}>
                    <td className="dim">{item.run_id}</td>
                    <td>{item.topic || '확인 필요'}</td>
                    <td>{item.title || '작성 전'}</td>
                    <td className={item.status === 'uploaded' ? 'ok-text' : 'dim'}>{autoTopicStatus(item.status)}</td>
                    <td className="dim">{item.generated_at ? new Date(item.generated_at).toLocaleString('ko-KR') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="dim">기록된 자동 생성 소재가 없습니다.</p>
        )}
        <Pagination pagination={autoTopicPagination} onPageChange={setAutoTopicPage} disabled={autoTopicLoading} />
      </section>

      <section className="card">
        <h2>오늘의 파이프라인 {status?.date && <span className="dim">({status.date})</span>}</h2>
        {status?.stages ? (
          <>
            <div className="stages">
              {['researcher', 'writer', 'producer', 'uploader'].map(stage => (
                <StageChip key={stage} name={stage} info={status.stages[stage]} />
              ))}
            </div>
            {status.stages.researcher?.topic && (
              <p className="topic">📌 오늘의 소재: <strong>{status.stages.researcher.topic}</strong></p>
            )}
            {status.stages.uploader?.url && (
              <p className="topic">▶ <a href={status.stages.uploader.url} target="_blank" rel="noreferrer">{status.stages.uploader.url}</a></p>
            )}
            {!status.success && status.message && <p className="error-msg">⚠️ {status.message}</p>}
          </>
        ) : (
          <p className="dim">오늘 실행 기록이 아직 없습니다. (예정: 11:00·14:00·17:00·21:00)</p>
        )}
      </section>

      <section className="card">
        <h2>업로드된 영상 <span className="dim">({videoPagination.total_items}건)</span></h2>
        {videoError && <p className="list-error">{videoError}</p>}
        {videoLoading && !videos.length ? (
          <p className="dim">영상 목록을 불러오는 중입니다.</p>
        ) : videos.length ? (
          <div className="table-scroll">
            <table>
              <thead><tr><th>날짜</th><th>제목</th><th>링크</th></tr></thead>
              <tbody>
                {videos.map(video => (
                  <tr key={video.video_id}>
                    <td className="dim">{video.date}</td>
                    <td>{video.title}</td>
                    <td><a href={video.url} target="_blank" rel="noreferrer">보기 ↗</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="dim">업로드된 영상이 없습니다.</p>
        )}
        <Pagination pagination={videoPagination} onPageChange={setVideoPage} disabled={videoLoading} />
      </section>

      <section className="card">
        <h2>실행 이력 <span className="dim">({historyPagination.total_items}건)</span></h2>
        {historyError && <p className="list-error">{historyError}</p>}
        {historyLoading && !runs.length ? (
          <p className="dim">실행 이력을 불러오는 중입니다.</p>
        ) : runs.length ? (
          <ul className="history">
            {runs.map((run, index) => (
              <li className="history-item" key={`${run.date}-${run.timestamp || index}`}>
                <div className="history-summary">
                  <span>{run.date}</span>
                  <span className={run.success ? 'ok-text' : 'err-text'}>
                    {run.success ? '✅ 성공' : `❌ 실패 — ${run.message || '원인 기록 없음'}`}
                  </span>
                </div>
                <RecoveryStatus recovery={run.recovery} />
                {run.recovery?.status === 'recovered' && run.stages?.uploader?.url && (
                  <a className="recovery-link" href={run.stages.uploader.url} target="_blank" rel="noreferrer">
                    복구된 영상 보기 ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="dim">실행 이력이 없습니다.</p>
        )}
        <Pagination pagination={historyPagination} onPageChange={setHistoryPage} disabled={historyLoading} />
      </section>

      {report?.category_ranking && (
        <section className="card">
          <h2>📊 카테고리별 성과</h2>
          {report.insight && <p className="topic">💡 {report.insight}</p>}
          <div className="table-scroll">
            <table>
              <thead><tr><th>순위</th><th>카테고리</th><th>영상</th><th>평균 조회수</th><th>평균 좋아요</th></tr></thead>
              <tbody>
                {report.category_ranking.map((category, index) => (
                  <tr key={category.category}>
                    <td className="dim">{index + 1}</td>
                    <td><strong>{category.category}</strong></td>
                    <td className="dim">{category.videos}개</td>
                    <td>{category.avg_views?.toLocaleString()}회</td>
                    <td className="dim">{category.avg_likes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.top_videos?.length > 0 && (
            <>
              <h2 className="subsection-title">🏆 조회수 TOP 5</h2>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>조회수</th><th>카테고리</th><th>주제</th></tr></thead>
                  <tbody>
                    {report.top_videos.map(video => (
                      <tr key={video.video_id}>
                        <td>{video.views?.toLocaleString()}회</td>
                        <td className="dim">{video.category}</td>
                        <td><a href={video.url} target="_blank" rel="noreferrer">{video.topic}</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {report.generated_at && (
            <p className="dim report-time">갱신: {new Date(report.generated_at).toLocaleString('ko-KR')}</p>
          )}
        </section>
      )}
    </div>
  )
}
