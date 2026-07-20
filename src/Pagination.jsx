import { getVisiblePages } from './pagination.js'


export default function Pagination({ pagination, onPageChange, disabled = false }) {
  const {
    page = 1,
    total_items: totalItems = 0,
    total_pages: totalPages = 0,
    has_previous: hasPrevious = false,
    has_next: hasNext = false,
  } = pagination || {}

  if (totalPages === 0) {
    return <div className="pagination-summary">총 0건</div>
  }

  return (
    <nav className="pagination" aria-label="페이지 탐색">
      <span className="pagination-summary">
        총 {totalItems.toLocaleString()}건 · {page} / {totalPages}페이지
      </span>
      <div className="page-buttons">
        <button type="button" onClick={() => onPageChange(1)} disabled={disabled || !hasPrevious}>
          처음
        </button>
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={disabled || !hasPrevious}>
          이전
        </button>
        {getVisiblePages(page, totalPages).map(number => (
          <button
            type="button"
            key={number}
            className={number === page ? 'active' : ''}
            aria-current={number === page ? 'page' : undefined}
            onClick={() => onPageChange(number)}
            disabled={disabled}
          >
            {number}
          </button>
        ))}
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={disabled || !hasNext}>
          다음
        </button>
        <button type="button" onClick={() => onPageChange(totalPages)} disabled={disabled || !hasNext}>
          마지막
        </button>
      </div>
    </nav>
  )
}
