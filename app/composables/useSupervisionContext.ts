import type { SupervisionRound } from '~/composables/useSupervisionGroups'

export const useSupervisionContext = () => {
  const route = useRoute()
  const { cycles, selectedCycle } = useCoopCycles()
  const queryCycle = String(route.query.cycle ?? '')
  const queryRound = Number(route.query.round)
  const cycleId = useState<string>('supervision-context-cycle-id', () => queryCycle)
  const round = useState<SupervisionRound>('supervision-context-round', () => Number.isInteger(queryRound) && queryRound >= 1 && queryRound <= 99 ? queryRound : 1)
  const scheduleGroupId = useState<string>('supervision-context-schedule-group-id', () => 'all')

  if (queryCycle && cycles.some(cycle => cycle.id === queryCycle)) cycleId.value = queryCycle
  watch(() => selectedCycle.value?.id, (selectedId) => {
    if (selectedId && !cycles.some(cycle => cycle.id === cycleId.value)) cycleId.value = selectedId
  }, { immediate: true })
  if (Number.isInteger(queryRound) && queryRound >= 1 && queryRound <= 99) round.value = queryRound

  const cycleOptions = computed(() => cycles.map(cycle => ({ value: cycle.id, label: cycle.label })))
  const selectedCycleLabel = computed(() => cycles.find(cycle => cycle.id === cycleId.value)?.label ?? 'ไม่พบรอบ')
  const selectedRoundLabel = computed(() => `นิเทศครั้งที่ ${round.value}`)
  const roundModel = computed({
    get: () => String(round.value),
    set: (value: string) => {
      const parsed = Number(value)
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 99) round.value = parsed
    },
  })

  return {
    cycleId,
    round,
    cycleOptions,
    selectedCycleLabel,
    selectedRoundLabel,
    roundModel,
    scheduleGroupId,
  }
}
