import { z } from 'zod'
import { parseFirstGeocodingResult, type GeocodingResult } from '../../utils/geocoding'

const querySchema = z.object({
  q: z.string().trim().min(5).max(500),
})
const cache = new Map<string, GeocodingResult | null>()
let providerQueue: Promise<void> = Promise.resolve()
let lastProviderRequestAt = 0

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds))

const enqueueProviderRequest = async <T>(request: () => Promise<T>): Promise<T> => {
  let release = () => {}
  const previous = providerQueue
  providerQueue = new Promise<void>((resolve) => { release = resolve })
  await previous
  try {
    const remainingDelay = Math.max(0, 1000 - (Date.now() - lastProviderRequestAt))
    if (remainingDelay) await wait(remainingDelay)
    const result = await request()
    lastProviderRequestAt = Date.now()
    return result
  }
  finally {
    release()
  }
}

export default defineEventHandler(async (event) => {
  const parsedQuery = querySchema.safeParse(getQuery(event))
  if (!parsedQuery.success) {
    throw createError({ statusCode: 400, statusMessage: 'กรุณากรอกที่อยู่ให้ครบถ้วน' })
  }

  const normalizedQuery = parsedQuery.data.q.replace(/\s+/g, ' ').toLocaleLowerCase('th')
  let result = cache.get(normalizedQuery)
  if (result === undefined) {
    const config = useRuntimeConfig(event)
    const response = await enqueueProviderRequest(() => $fetch<unknown>(`${config.geocodingBaseUrl}/search`, {
      query: {
        q: parsedQuery.data.q,
        format: 'jsonv2',
        limit: 1,
        'accept-language': 'th',
      },
      headers: {
        'User-Agent': config.geocodingUserAgent,
      },
    }))
    result = parseFirstGeocodingResult(response)
    if (cache.size >= 200) cache.delete(cache.keys().next().value!)
    cache.set(normalizedQuery, result)
  }

  if (!result) throw createError({ statusCode: 404, statusMessage: 'ไม่พบพิกัดจากที่อยู่' })
  return result
})
