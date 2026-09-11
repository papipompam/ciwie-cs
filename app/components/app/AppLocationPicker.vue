<script setup lang="ts">
import { LocateFixed, MapPin, Search } from '@lucide/vue'
import { z } from 'zod'
import type { Map as LeafletMap, Marker, TileLayer } from 'leaflet'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

interface Coordinates { latitude: number | null, longitude: number | null }
const props = withDefaults(defineProps<{
  latitude: number | null
  longitude: number | null
  error?: string
  showCoordinateInputs?: boolean
  coordinatesRequired?: boolean
}>(), {
  error: undefined,
  showCoordinateInputs: true,
  coordinatesRequired: true,
})
const emit = defineEmits<{ change: [coordinates: Coordinates], validity: [valid: boolean] }>()
const config = useRuntimeConfig()
const id = useId()
const mapRoot = ref<HTMLDivElement | null>(null)
const loading = ref(true)
const mapError = ref('')
const locating = ref(false)
const locationError = ref('')
const placeSearchQuery = ref('')
const searchingPlace = ref(false)
const placeSearchMessage = ref('')
const placeSearchError = ref('')
const hasCoordinates = computed(() => props.latitude !== null && props.longitude !== null)
let map: LeafletMap | undefined
let marker: Marker | undefined
let tiles: TileLayer | undefined
let leaflet: typeof import('leaflet') | undefined
let observer: ResizeObserver | undefined
let tileErrorTimer: ReturnType<typeof setTimeout> | undefined
let disposed = false
// Keep incomplete/invalid typing visible, but never submit an older valid coordinate.
const coordinateText = reactive({ latitude: String(props.latitude ?? ''), longitude: String(props.longitude ?? '') })
const parseCoordinate = (field: keyof Coordinates, value: string): number | null => {
  if (!value.trim()) return null
  const limit = field === 'latitude' ? 90 : 180
  const parsed = z.number().min(-limit).max(limit).safeParse(Number(value))
  return parsed.success ? parsed.data : null
}
const coordinateError = (field: keyof Coordinates) => coordinateText[field].trim() && parseCoordinate(field, coordinateText[field]) === null
  ? `กรอกตัวเลขระหว่าง ${field === 'latitude' ? '-90 ถึง 90' : '-180 ถึง 180'}` : undefined
watch(() => [coordinateError('latitude'), coordinateError('longitude')], errors => emit('validity', !errors.some(Boolean)), { immediate: true, flush: 'sync' })
const updateCoordinate = (field: keyof Coordinates, value: string) => {
  coordinateText[field] = value
  const coordinates = {
    latitude: parseCoordinate('latitude', coordinateText.latitude),
    longitude: parseCoordinate('longitude', coordinateText.longitude),
  }
  emit('change', coordinates)
  if (coordinates.latitude !== null && coordinates.longitude !== null) map?.setView([coordinates.latitude, coordinates.longitude], 17)
}
watch(() => [props.latitude, props.longitude], () => {
  for (const field of ['latitude', 'longitude'] as const) {
    if (parseCoordinate(field, coordinateText[field]) !== props[field]) coordinateText[field] = String(props[field] ?? '')
  }
})

const selectCoordinates = (latitude: number, longitude: number) => {
  const wrappedLongitude = ((longitude + 180) % 360 + 360) % 360 - 180
  const coordinates = { latitude: Number(Math.max(-90, Math.min(90, latitude)).toFixed(7)), longitude: Number(wrappedLongitude.toFixed(7)) }
  coordinateText.latitude = String(coordinates.latitude)
  coordinateText.longitude = String(coordinates.longitude)
  emit('change', coordinates)
}
const syncMarker = () => {
  if (!map || !leaflet) return
  if (!hasCoordinates.value) {
    marker?.remove()
    marker = undefined
    return
  }
  const position: [number, number] = [props.latitude!, props.longitude!]
  if (marker) marker.setLatLng(position)
  else {
    marker = leaflet.marker(position, {
      draggable: true,
      title: 'สถานที่ฝึกสหกิจ ลากเพื่อย้ายหมุด',
      alt: 'หมุดสถานที่ฝึกสหกิจ',
      icon: leaflet.icon({ iconUrl: markerIconUrl, iconRetinaUrl: markerIconRetinaUrl, shadowUrl: markerShadowUrl, iconSize: [25, 41], iconAnchor: [12, 41], shadowSize: [41, 41] }),
    }).addTo(map)
    marker.on('dragend', () => {
      const point = marker?.getLatLng()
      if (point) selectCoordinates(point.lat, point.lng)
    })
  }
  if (!map.getBounds().contains(position)) map.panTo(position, { animate: false })
}

const initializeMap = async () => {
  loading.value = true
  mapError.value = ''
  if (tileErrorTimer) clearTimeout(tileErrorTimer)
  tileErrorTimer = undefined
  try {
    leaflet = await import('leaflet')
    if (disposed || !mapRoot.value) return
    map?.remove()
    marker = undefined
    map = leaflet.map(mapRoot.value, { scrollWheelZoom: false }).setView(
      hasCoordinates.value ? [props.latitude!, props.longitude!] : [14.994, 103.103],
      hasCoordinates.value ? 16 : 6,
    )
    tiles = leaflet.tileLayer(config.public.locationMapTileUrl, {
      attribution: config.public.locationMapTileAttribution,
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map)
    let tileLoaded = false
    tiles.on('tileload', () => {
      tileLoaded = true
      mapError.value = ''
      if (tileErrorTimer) clearTimeout(tileErrorTimer)
      tileErrorTimer = undefined
    })
    tiles.on('tileerror', () => {
      // A single tile can fail while the rest of the map is still usable.
      // Only show an error when no tile has loaded after a short grace period.
      if (tileLoaded || tileErrorTimer) return
      tileErrorTimer = setTimeout(() => {
        tileErrorTimer = undefined
        if (!tileLoaded && !disposed) mapError.value = 'โหลดภาพแผนที่ไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง'
      }, 5000)
    })
    map.on('click', (event) => selectCoordinates(event.latlng.lat, event.latlng.lng))
    syncMarker()
    observer?.disconnect()
    observer = new ResizeObserver(() => map?.invalidateSize())
    observer.observe(mapRoot.value)
  }
  catch {
    mapError.value = 'เปิดแผนที่ไม่สำเร็จ กรุณาลองอีกครั้ง'
  }
  finally {
    if (!disposed) loading.value = false
  }
}
const selectCenter = () => {
  const point = map?.getCenter()
  if (point) selectCoordinates(point.lat, point.lng)
}
const locate = () => {
  locationError.value = ''
  if (!navigator.geolocation) {
    locationError.value = 'อุปกรณ์นี้ไม่รองรับตำแหน่งปัจจุบัน กรุณาปักหมุดบนแผนที่'
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition((position) => {
    if (disposed) return
    locating.value = false
    map?.setView([position.coords.latitude, position.coords.longitude], 17)
    selectCoordinates(position.coords.latitude, position.coords.longitude)
  }, () => {
    if (disposed) return
    locating.value = false
    locationError.value = 'ระบุตำแหน่งไม่ได้ กรุณาอนุญาตตำแหน่งหรือปักหมุดบนแผนที่เอง'
  }, { timeout: 10000 })
}

const searchPlace = async () => {
  const query = placeSearchQuery.value.trim()
  if (searchingPlace.value || query.length < 5) return
  searchingPlace.value = true
  placeSearchMessage.value = ''
  placeSearchError.value = ''
  try {
    const result = await $fetch<{ latitude: number, longitude: number, displayName: string }>('/api/geocoding/search', {
      query: { q: query },
    })
    if (disposed) return
    selectCoordinates(result.latitude, result.longitude)
    map?.setView([result.latitude, result.longitude], 17)
    placeSearchMessage.value = `พบตำแหน่ง: ${result.displayName}`
  }
  catch {
    placeSearchError.value = 'ไม่พบสถานที่นี้ ลองระบุชื่อสถานที่ จังหวัด หรืออำเภอเพิ่ม'
  }
  finally {
    searchingPlace.value = false
  }
}

watch(placeSearchQuery, () => {
  placeSearchMessage.value = ''
  placeSearchError.value = ''
})

watch(() => [props.latitude, props.longitude], syncMarker)
onMounted(initializeMap)
onBeforeUnmount(() => {
  disposed = true
  if (tileErrorTimer) clearTimeout(tileErrorTimer)
  observer?.disconnect()
  map?.remove()
})
</script>

<template>
  <fieldset :aria-describedby="`${id}-help ${id}-status`" class="min-w-0">
    <legend class="text-sm font-semibold text-ink">สถานที่ฝึกสหกิจ <span v-if="coordinatesRequired" class="text-danger" aria-hidden="true">*</span></legend>
    <p :id="`${id}-help`" class="mt-1 text-xs leading-5 text-muted">{{ showCoordinateInputs ? `ค้นหาสถานที่ คลิกแผนที่ ลากหมุด หรือกรอกพิกัด${coordinatesRequired ? ' แล้วตรวจสอบตำแหน่งก่อนบันทึก' : ' (ไม่บังคับกรอก)'}` : 'ค้นหาสถานที่ คลิกแผนที่ หรือลากหมุด แล้วตรวจสอบตำแหน่งก่อนบันทึก' }}</p>
    <div class="mt-3 rounded-control border border-divider bg-surface p-3 [&_label]:font-medium">
      <UiInput v-model="placeSearchQuery" label="ค้นหาสถานที่" placeholder="เช่น มหาวิทยาลัยราชภัฏบุรีรัมย์ หรือ บริษัท ABC บุรีรัมย์" input-class="!min-h-9 text-xs" />
      <div class="mt-3">
        <UiButton variant="secondary" size="sm" :icon="Search" :loading="searchingPlace" :disabled="placeSearchQuery.trim().length < 5 || loading" @click="searchPlace">
          ค้นหาสถานที่
        </UiButton>
        <p v-if="placeSearchError" class="mt-2 text-xs text-danger" role="alert">{{ placeSearchError }}</p>
        <p v-else-if="placeSearchMessage" class="mt-2 text-xs leading-5 text-muted" role="status">{{ placeSearchMessage }}</p>
      </div>
      <p v-if="showCoordinateInputs" class="mt-3 text-xs leading-5 text-muted">หากไม่พบสถานประกอบการจากการค้นหา กรุณาระบุค่าละติจูดและลองจิจูดด้วยตนเอง (ไม่บังคับ)</p>
      <div v-if="showCoordinateInputs" class="mt-3 grid gap-3 sm:grid-cols-2 [&_label]:font-medium">
        <div><UiInput :model-value="coordinateText.latitude" label="ละติจูด" placeholder="เช่น 14.994" :error="coordinateError('latitude')" :required="coordinatesRequired" input-class="!min-h-9 text-xs" @update:model-value="updateCoordinate('latitude', $event)" /></div>
        <div><UiInput :model-value="coordinateText.longitude" label="ลองจิจูด" placeholder="เช่น 103.103" :error="coordinateError('longitude')" :required="coordinatesRequired" input-class="!min-h-9 text-xs" @update:model-value="updateCoordinate('longitude', $event)" /></div>
      </div>
    </div>
    <div class="relative isolate mt-3 overflow-hidden rounded-control border" :class="error ? 'border-danger' : 'border-divider'">
      <div ref="mapRoot" class="h-64 w-full bg-surface sm:h-72" role="region" aria-label="แผนที่เลือกสถานที่ฝึกสหกิจ" />
      <div v-if="loading" class="absolute inset-0 z-[1000] bg-canvas p-4" role="status" aria-label="กำลังโหลดแผนที่"><UiSkeleton class="h-full w-full" /></div>
    </div>
    <div v-if="mapError" class="mt-2 flex flex-wrap items-center justify-between gap-2" role="alert">
      <p class="text-xs text-danger">{{ mapError }}</p><UiButton variant="secondary" size="sm" @click="initializeMap">ลองอีกครั้ง</UiButton>
    </div>
    <div class="mt-3 flex flex-wrap gap-2">
      <UiButton variant="secondary" size="sm" :icon="MapPin" :disabled="loading || Boolean(mapError)" @click="selectCenter">ปักหมุดตรงกลาง</UiButton>
      <UiButton variant="ghost" size="sm" :icon="LocateFixed" :disabled="loading" :loading="locating" @click="locate">ใช้ตำแหน่งปัจจุบัน</UiButton>
    </div>
    <p v-if="locationError" class="mt-2 text-xs text-danger" role="alert">{{ locationError }}</p>
    <p :id="`${id}-status`" class="mt-2 text-xs leading-5" :class="error ? 'text-danger' : 'text-muted'" aria-live="polite">
      <template v-if="error">{{ error }}</template>
      <template v-else-if="hasCoordinates">ปักหมุดแล้ว — ตรวจสอบตำแหน่งก่อนบันทึก</template>
      <template v-else>ยังไม่ได้ปักหมุด</template>
    </p>
  </fieldset>
</template>
