export default defineEventHandler(() => {
  const value = process.env.DATABASE_URL ?? ''
  return {
    length: value.length,
    firstCodes: Array.from(value.slice(0, 12), char => char.charCodeAt(0)),
    lastCodes: Array.from(value.slice(-12), char => char.charCodeAt(0)),
    protocolIndex: value.search(/(?:mariadb|mysql2?):/i),
    hasEscapedSlash: value.includes('\\/'),
    hasAssignment: /^\s*DATABASE_URL\s*=/i.test(value),
    hasBraces: /[{}]/.test(value),
  }
})
