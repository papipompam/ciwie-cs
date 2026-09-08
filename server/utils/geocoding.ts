import { z } from 'zod'

const nominatimResultSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  display_name: z.string().trim().min(1),
})

export interface GeocodingResult {
  latitude: number
  longitude: number
  displayName: string
}

export const parseFirstGeocodingResult = (input: unknown): GeocodingResult | null => {
  if (!Array.isArray(input) || !input.length) return null
  const parsed = nominatimResultSchema.safeParse(input[0])
  if (!parsed.success) return null
  return {
    latitude: parsed.data.lat,
    longitude: parsed.data.lon,
    displayName: parsed.data.display_name,
  }
}
