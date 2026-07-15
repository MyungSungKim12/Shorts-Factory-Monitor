import { useEffect, useState } from 'react'

const STAGE_LABELS = {
  researcher: '① 소재 리서치',
  writer: '② 대본 작성',
  producer: '③ 영상 제작',
  uploader: '④ 업로드',
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
  const [videos, setVideos] = useState([])
  const [runs, setRuns] = useState([])
  const [report, setReport] = useState(null)
  const [lastSync, setLastSync] = useState(null)

  const load = () => {
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => setHealth(null))
    fetch('/api/status').then(r => r.json()).then(setStatus).catch(() => {})
    fetch('/api/videos').then(r => r.json()).then(d => setVideos(d.videos || [])).catch(() => {})
    fetch('/api/history').then(r => r.json()).then(d => setRuns(d.runs || [])).catch(() => {})
    fetch('/api/report').then(r => r.json()).then(setReport).catch(() => {})
    setLastSync(new Date().toLocaleTimeString('ko-KR'))
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 30000) // 30초마다 자동 갱신
    return () => clearInterval(timer)
  }, [])

  const serverUp = health?.status === 'ok'
  const pipelineRunning = health?.running

  return (
    <div className="container">
      <header>
        <div>
          <h1>🎬 Shorts Factory</h1>
          <p>매일 18:00 자동 실행 · 30초마다 자동 갱신 {lastSync && `(마지막: ${lastSync})`}</p>
        </div>
        <div className={`server-badge ${serverUp ? 'up' : 'down'}`}>
          {serverUp ? (pipelineRunning ? '🟡 파이프라인 실행 중' : '🟢 서버 정상') : '🔴 서버 연결 안 됨'}
        </div>
      </header>

      <section className="card">
        <h2>오늘의 파이프라인 {status?.date && <span className="dim">({status.date})</span>}</h2>
        {status?.stages ? (
          <>
            <div className="stages">
              {['researcher', 'writer', 'producer', 'uploader'].map(s => (
                <StageChip key={s} name={s} info={status.stages[s]} />
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
          <p className="dim">오늘 실행 기록이 아직 없습니다 (예정: 18:00)</p>
        )}
      </section>

      <section className="card">
        <h2>업로드된 영상 ({videos.length})</h2>
        {videos.length ? (
          <table>
            <thead>
              <tr><th>날짜</th><th>제목</th><th>링크</th></tr>
            </thead>
            <tbody>
              {videos.map(v => (
                <tr key={v.video_id}>
                  <td className="dim">{v.date}</td>
                  <td>{v.title}</td>
                  <td><a href={v.url} target="_blank" rel="noreferrer">보기 ↗</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="dim">업로드된 영상 없음</p>
        )}
      </section>

      <section className="card">
        <h2>최근 실행 이력</h2>
        {runs.length ? (
          <ul className="history">
            {runs.map(r => (
              <li key={r.date}>
                <span>{r.date}</span>
                <span className={r.success ? 'ok-text' : 'err-text'}>
                  {r.success ? '✓ 성공' : `✗ 실패 — ${(r.message || '').slice(0, 60)}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dim">실행 이력 없음</p>
        )}
      </section>

      {report && report.category_ranking && (
        <section className="card">
          <h2>📊 카테고리별 성과</h2>
          {report.insight && <p className="topic">💡 {report.insight}</p>}
          <table>
            <thead>
              <tr><th>순위</th><th>카테고리</th><th>영상</th><th>평균 조회수</th><th>평균 좋아요</th></tr>
            </thead>
            <tbody>
              {report.category_ranking.map((c, i) => (
                <tr key={c.category}>
                  <td className="dim">{i + 1}</td>
                  <td><strong>{c.category}</strong></td>
                  <td className="dim">{c.videos}개</td>
                  <td>{c.avg_views?.toLocaleString()}회</td>
                  <td className="dim">{c.avg_likes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.top_videos?.length > 0 && (
            <>
              <h2 style={{ marginTop: '20px' }}>🏆 조회수 TOP 5</h2>
              <table>
                <thead><tr><th>조회수</th><th>카테고리</th><th>주제</th></tr></thead>
                <tbody>
                  {report.top_videos.map(v => (
                    <tr key={v.video_id}>
                      <td>{v.views?.toLocaleString()}회</td>
                      <td className="dim">{v.category}</td>
                      <td><a href={v.url} target="_blank" rel="noreferrer">{v.topic}</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {report.generated_at && (
            <p className="dim" style={{ marginTop: '12px' }}>
              갱신: {new Date(report.generated_at).toLocaleString('ko-KR')}
            </p>
          )}
        </section>
      )}
    </div>
  )
}
