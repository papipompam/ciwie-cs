export default defineAppConfig({
  ui: {
    colors: {
      primary: 'teal',
      neutral: 'slate'
    },
    button: {
      slots: {
        base: 'min-h-11 cursor-pointer justify-center font-medium'
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

