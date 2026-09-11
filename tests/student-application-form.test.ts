import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const pagePath = fileURLToPath(new URL('../app/pages/student/applications/index.vue', import.meta.url))

describe('student application form', () => {
  it('lets a student select the required province when creating an application', async () => {
    const page = await readFile(pagePath, 'utf8')
    const provinceField = page.indexOf('v-model="form.province"')
    const editOnlyFields = page.indexOf('<template v-if="editingId">')

    expect(provinceField).toBeGreaterThan(-1)
    expect(editOnlyFields).toBeGreaterThan(-1)
    expect(provinceField).toBeLessThan(editOnlyFields)
  })
})
