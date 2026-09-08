export const getPageCount = (totalItems: number, pageSize: number) => {
  if (pageSize <= 0) return 1
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

export const paginateItems = <T>(items: T[], page: number, pageSize: number) => {
  if (pageSize <= 0) return []
  const safePage = Math.max(1, Math.min(page, getPageCount(items.length, pageSize)))
  const start = (safePage - 1) * pageSize
  return items.slice(start, start + pageSize)
}
