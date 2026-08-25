const sessionPassword = process.env.NUXT_SESSION_PASSWORD

export default defineNuxtConfig({
  compatibilityDate: '2026-08-18',
  devtools: { enabled: false },
  modules: ['@nuxt/ui', 'nuxt-auth-utils', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true,
    typeCheck: true
  },
  runtimeConfig: {
    session: {
      password: sessionPassword || 'development-only-session-password-change-me',
      maxAge: 60 * 60 * 8,
      cookie: {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    storage: {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || 'ciwie-private',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    antivirus: {
      host: process.env.CLAMAV_HOST || '127.0.0.1',
      port: Number(process.env.CLAMAV_PORT || 3310)
    },
    public: {
      appName: 'ระบบจัดการการนิเทศสหกิจศึกษา'
    }
  },
  routeRules: {
    '/api/**': { cors: false }
  }
})
