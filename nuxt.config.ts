import tailwindcss from '@tailwindcss/vite'

const configuredMapProvider = process.env.NUXT_PUBLIC_MAP_PROVIDER?.trim().toLowerCase()
const stadiaApiKey = process.env.NUXT_PUBLIC_STADIA_MAPS_API_KEY?.trim()
// Stadia requires an API key outside localhost. Keep the map usable on a fresh
// production deployment, then automatically use Stadia as soon as its key is set.
const mapProvider = configuredMapProvider === 'custom'
  ? 'custom'
  : stadiaApiKey
    ? 'stadia'
    : 'openstreetmap'
const stadiaTileUrl = `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png${stadiaApiKey ? `?api_key=${encodeURIComponent(stadiaApiKey)}` : ''}`
const mapTileUrl = mapProvider === 'stadia'
  ? stadiaTileUrl
  : mapProvider === 'custom'
    ? process.env.NUXT_PUBLIC_MAP_TILE_URL?.trim() || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const mapTileAttribution = mapProvider === 'stadia'
  ? '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noopener noreferrer">Stadia Maps</a> &copy; <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
  : mapProvider === 'custom'
    ? process.env.NUXT_PUBLIC_MAP_TILE_ATTRIBUTION?.trim() || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

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
    // Avoid legacy NUXT_GEOCODING_* variables overriding the Nominatim API
    // contract used by the location picker.
    locationGeocodingBaseUrl: 'https://nominatim.openstreetmap.org',
    locationGeocodingUserAgent: 'CWIE-BRU-Supervision/1.0',
    public: {
      // Keep these names scoped to this app. Older Vercel variables named
      // NUXT_PUBLIC_MAP_* would otherwise override them at runtime.
      locationMapProvider: mapProvider,
      locationMapTileUrl: mapTileUrl,
      locationMapTileAttribution: mapTileAttribution,
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
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
