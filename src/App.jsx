import { useCallback, useEffect, useRef, useState } from 'react'

import Pagination from './Pagination.jsx'
import { normalizePage } from './pagination.js'


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

export default function App() {
  const [health, setHealth] = useState(null)
  const [status, setStatus] = useState(null)
  const [report, setReport] = useState(null)
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

  const videoRequest = useRef(0)
  const historyRequest = useRef(0)

  const loadOverview = useCallback(async () => {
    const [healthResult, statusResult, reportResult] = await Promise.allSettled([
      fetchJson('/api/health'),
      fetchJson('/api/status'),
      fetchJson('/api/report'),
    ])
    setHealth(healthResult.status === 'fulfilled' ? healthResult.value : null)
    if (statusResult.status === 'fulfilled') setStatus(statusResult.value)
    if (reportResult.status === 'fulfilled') setReport(reportResult.value)
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
    const timer = setInterval(() => {
      loadOverview()
      loadVideos(videoPage)
      loadHistory(historyPage)
    }, 30000)
    return () => clearInterval(timer)
  }, [historyPage, loadHistory, loadOverview, loadVideos, videoPage])

  const refreshAll = () => {
    loadOverview()
    loadVideos(videoPage)
    loadHistory(historyPage)
  }

  const serverUp = health?.status === 'ok'
  const pipelineRunning = health?.running

  return (
    <div className="container">
      <header>
        <div>
          <h1>🎬 Shorts Factory</h1>
          <p>매일 11:00·17:00·21:00 자동 실행 · 30초마다 자동 갱신 {lastSync && `(마지막 ${lastSync})`}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="refresh-button" onClick={refreshAll}>새로고침</button>
          <div className={`server-badge ${serverUp ? 'up' : 'down'}`}>
            {serverUp ? (pipelineRunning ? '🟡 파이프라인 실행 중' : '🟢 서버 정상') : '🔴 서버 연결 안 됨'}
          </div>
        </div>
      </header>

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
          <p className="dim">오늘 실행 기록이 아직 없습니다. (예정: 11:00·17:00·21:00)</p>
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
              <li key={`${run.date}-${run.timestamp || index}`}>
                <span>{run.date}</span>
                <span className={run.success ? 'ok-text' : 'err-text'}>
                  {run.success ? '✅ 성공' : `❌ 실패 — ${(run.message || '').slice(0, 60)}`}
                </span>
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
