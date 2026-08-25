import { createHash } from 'node:crypto'

function scriptHashes(html: string): string[] {
  const hashes = new Set<string>()
  const inlineScript = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi
  for (const match of html.matchAll(inlineScript)) {
    const content = match[1]
    if (!content) continue
    hashes.add(`'sha256-${createHash('sha256').update(content).digest('base64')}'`)
  }
  return [...hashes]
}

export function buildHtmlContentSecurityPolicy(html: string): string {
  const scripts = ["'self'", ...scriptHashes(html)].join(' ')
  return [
    "default-src 'self'",
    `script-src ${scripts}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}
