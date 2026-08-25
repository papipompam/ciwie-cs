export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== 'production') return
  const password = process.env.NUXT_SESSION_PASSWORD?.trim()
  const knownDevelopmentValues = new Set([
    'change-me',
    'development-only-change-me-32chars',
    '0123456789abcdef0123456789abcdef',
  ])
  if (!password || password.length < 32 || knownDevelopmentValues.has(password)) {
    throw new Error('Production requires a unique NUXT_SESSION_PASSWORD of at least 32 characters')
  }
})
