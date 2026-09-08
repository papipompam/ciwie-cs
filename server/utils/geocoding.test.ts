import { describe, expect, it } from 'vitest'
import { parseFirstGeocodingResult } from './geocoding'

describe('parseFirstGeocodingResult', () => {
  it('maps the first valid Nominatim result to application coordinates', () => {
    expect(parseFirstGeocodingResult([{ lat: '14.9941234', lon: '103.1035678', display_name: 'มหาวิทยาลัยราชภัฏบุรีรัมย์' }])).toEqual({
      latitude: 14.9941234,
      longitude: 103.1035678,
      displayName: 'มหาวิทยาลัยราชภัฏบุรีรัมย์',
    })
  })

  it.each([[], null, [{ lat: 'invalid', lon: '103', display_name: 'บุรีรัมย์' }], [{ lat: '14', lon: '181', display_name: 'บุรีรัมย์' }]])('rejects empty or invalid provider data', (input) => {
    expect(parseFirstGeocodingResult(input)).toBeNull()
  })
})
