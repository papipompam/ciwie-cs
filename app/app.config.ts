export default defineAppConfig({
  ui: {
    colors: {
      primary: 'indigo',
      neutral: 'slate',
      success: 'emerald',
      warning: 'amber',
      error: 'rose',
      info: 'blue'
    },
    button: {
      slots: {
        base: 'min-h-10 cursor-pointer justify-center rounded-lg font-semibold'
      }
    },
    input: {
      slots: {
        root: 'w-full',
        base: 'min-h-11'
      }
    },
    select: {
      slots: {
        root: 'w-full',
        base: 'min-h-11'
      }
    }
  }
})
