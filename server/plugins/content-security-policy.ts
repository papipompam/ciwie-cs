import { buildHtmlContentSecurityPolicy } from '../utils/content-security-policy'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response) => {
    if (typeof response.body !== 'string' || !response.body.includes('<html')) return
    response.headers ??= {}
    response.headers['content-security-policy'] = buildHtmlContentSecurityPolicy(response.body)
  })
})
