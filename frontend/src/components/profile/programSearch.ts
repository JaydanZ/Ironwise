export const PROGRAMS_PER_PAGE = 5

export const SEARCH_DEBOUNCE_MS = 180

export const normalizeSearchQuery = (query: string): string =>
  query.trim().replace(/\s+/g, ' ').toLowerCase()

export const pageCountFor = (total: number, pageSize: number): number =>
  Math.ceil(total / pageSize)

export const rowsOnPage = (
  pageIndex: number,
  total: number,
  pageSize: number
): number => Math.max(0, Math.min(pageSize, total - pageIndex * pageSize))
