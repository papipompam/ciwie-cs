import type { SupervisionRound } from '~/composables/useSupervisionGroups'

export const useSupervisionContext = () => {
  const route = useRoute()
  const { cycles, selectedCycle } = useCoopCycles()
  const queryCycle = String(route.query.cycle ?? '')
  const initialCycleId = cycles.some(cycle => cycle.id === queryCycle)
    ? queryCycle
    : selectedCycle.value.id

  const cycleId = useState<string>('supervision-context-cycle-id', () => initialCycleId)
  const round = useState<SupervisionRound>('supervision-context-round', () => route.query.round === '2' ? 2 : 1)
  const scheduleGroupId = useState<string>('supervision-context-schedule-group-id', () => 'all')

  if (queryCycle && cycles.some(cycle => cycle.id === queryCycle)) cycleId.value = queryCycle
  if (!cycles.some(cycle => cycle.id === cycleId.value)) cycleId.value = selectedCycle.value.id
  if (route.query.round === '1' || route.query.round === '2') round.value = Number(route.query.round) as SupervisionRound

  const cycleOptions = cycles.map(cycle => ({ value: cycle.id, label: cycle.label }))
  const roundOptions = [
    { value: '1', label: 'นิเทศครั้งที่ 1' },
    { value: '2', label: 'นิเทศครั้งที่ 2' },
  ]
  const selectedCycleLabel = computed(() => cycles.find(cycle => cycle.id === cycleId.value)?.label ?? 'ไม่พบรอบ')
  const selectedRoundLabel = computed(() => roundOptions.find(option => option.value === String(round.value))?.label ?? 'ไม่พบครั้งที่นิเทศ')
  const roundModel = computed({
    get: () => String(round.value),
    set: value => { round.value = Number(value) as SupervisionRound },
  })

  return {
    cycleId,
    round,
    cycleOptions,
    roundOptions,
    selectedCycleLabel,
    selectedRoundLabel,
    roundModel,
    scheduleGroupId,
  }
}
