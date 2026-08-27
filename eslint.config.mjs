import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  ignores: [
    '.agents/skills/**',
    '.github/skills/**',
    '.github/agents/**'
  ]
})
