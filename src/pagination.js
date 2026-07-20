export function normalizePage(page, totalPages) {
  if (totalPages < 1) return 1
  return Math.min(Math.max(page, 1), totalPages)
}

export function getVisiblePages(page, totalPages, maxVisible = 5) {
  if (totalPages < 1) return []
  const count = Math.min(maxVisible, totalPages)
  const current = normalizePage(page, totalPages)
  const start = Math.min(
    Math.max(current - Math.floor(count / 2), 1),
    totalPages - count + 1,
  )
  return Array.from({ length: count }, (_, index) => start + index)
}
