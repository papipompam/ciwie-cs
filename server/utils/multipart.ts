export const normalizeMultipartContentType = (contentType: string) =>
  contentType.replace(/(boundary=)"([^"\r\n]+)"/i, '$1$2')

export const normalizeMultipartBoundaryHeader = (event: Parameters<typeof getRequestHeader>[0]) => {
  const contentType = getRequestHeader(event, 'content-type')
  if (!contentType) return
  const normalized = normalizeMultipartContentType(contentType)
  if (normalized !== contentType) event.node.req.headers['content-type'] = normalized
}
