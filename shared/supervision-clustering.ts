import { z } from 'zod'

export interface LocatedCompany {
  id: string
  latitude?: number | null
  longitude?: number | null
}

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export const clusteringOptionsSchema = z.object({
  maxDistanceKm: z.coerce.number().positive('ระบุระยะมากกว่า 0 กม.').max(500, 'ระยะสูงสุด 500 กม.'),
  maxCompanies: z.coerce.number().int().min(1, 'อย่างน้อย 1 แห่ง').max(50, 'ไม่เกิน 50 แห่งต่อกลุ่ม'),
})

export const distanceKm = (a: { latitude: number, longitude: number }, b: { latitude: number, longitude: number }) => {
  const rad = Math.PI / 180
  const h = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2
    + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)))
}

// Complete-link agglomerative clustering: every pair respects the distance limit.
// Distance is calculated along the earth's surface, not by road or travel time.
export const clusterCompanies = (companies: LocatedCompany[], options: z.input<typeof clusteringOptionsSchema>) => {
  const { maxDistanceKm, maxCompanies } = clusteringOptionsSchema.parse(options)
  if (new Set(companies.map(company => company.id)).size !== companies.length) throw new Error('รหัสสถานประกอบการซ้ำ')
  const missingIds: string[] = []
  const located = companies.toSorted((a, b) => a.id.localeCompare(b.id)).flatMap(company => {
    const result = coordinatesSchema.safeParse(company)
    if (!result.success) {
      missingIds.push(company.id)
      return []
    }
    return [{ id: company.id, ...result.data }]
  })
  const clusters = located.map(company => [company])
  while (true) {
    let best: { a: number, b: number, distance: number } | undefined
    for (let a = 0; a < clusters.length; a++) {
      for (let b = a + 1; b < clusters.length; b++) {
        if (clusters[a]!.length + clusters[b]!.length > maxCompanies) continue
        const distance = Math.max(...clusters[a]!.flatMap(left => clusters[b]!.map(right => distanceKm(left, right))))
        if (distance <= maxDistanceKm && (!best || distance < best.distance)) best = { a, b, distance }
      }
    }
    if (!best) break
    clusters[best.a]!.push(...clusters[best.b]!)
    clusters.splice(best.b, 1)
  }
  return { groups: clusters.map(cluster => cluster.map(company => company.id)), missingIds }
}
