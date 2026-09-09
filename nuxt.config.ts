import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint'],
  runtimeConfig: {
    fileStorageRoot: process.env.FILE_STORAGE_ROOT ?? '.data/uploads',
    initialAccountPassword: process.env.INITIAL_ACCOUNT_PASSWORD
      ?? (process.env.NODE_ENV === 'production' ? '' : 'Cwie@2569'),
    sessionPassword: process.env.NUXT_SESSION_PASSWORD
      ?? (process.env.NODE_ENV === 'production' ? '' : 'development-only-session-password-change-me'),
    geocodingBaseUrl: 'https://nominatim.openstreetmap.org',
    geocodingUserAgent: 'CWIE-BRU-Supervision/1.0',
    public: {
      mapTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      mapTileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'th' },
      title: 'CWIE BRU',
      titleTemplate: '%s | CWIE BRU',
      link: [
        { rel: 'icon', type: 'image/png', href: '/images/brand/computer-science-full.png' },
      ],
    },
  },
  css: [
    '@fontsource/prompt/thai-300.css',
    '@fontsource/prompt/latin-300.css',
    '@fontsource/prompt/thai-400.css',
    '@fontsource/prompt/latin-400.css',
    '@fontsource/prompt/thai-500.css',
    '@fontsource/prompt/latin-500.css',
    '@fontsource/prompt/thai-600.css',
    '@fontsource/prompt/latin-600.css',
    '@fontsource/prompt/thai-700.css',
    '@fontsource/prompt/latin-700.css',
    '~/assets/css/main.css',
  ],
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],
  nitro: {
    externals: {
      trace: false,
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
