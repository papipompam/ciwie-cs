export type ScenarioViewState = 'data' | 'loading' | 'empty' | 'error'
export type ScenarioRole = 'staff' | 'lecturer' | 'student'
export type ScenarioDataSet = 'normal' | 'long' | 'edge'
export type ScenarioNetworkDelay = 'none' | 'slow'

export interface ScenarioEvent {
  id: string
  title: string
  createdAt: string
}

export interface ScenarioState {
  role: ScenarioRole
  userName: string
  cycle: string
  viewState: ScenarioViewState
  dataSet: ScenarioDataSet
  networkDelay: ScenarioNetworkDelay
  forceError: boolean
}

const defaults: ScenarioState = {
  role: 'staff',
  userName: 'นางสาวพิมพ์ชนก ใจดี',
  cycle: 'ภาคเรียนที่ 2/2569',
  viewState: 'data',
  dataSet: 'normal',
  networkDelay: 'none',
  forceError: false,
}

export const useScenario = () => {
  const scenario = useState<ScenarioState>('dev-scenario', () => ({ ...defaults }))
  const events = useState<ScenarioEvent[]>('dev-scenario-events', () => [])

  const recordEvent = (title: string) => {
    events.value.unshift({
      id: crypto.randomUUID(),
      title,
      createdAt: new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()),
    })
    events.value = events.value.slice(0, 5)
  }

  const resetScenario = () => {
    scenario.value = { ...defaults }
    events.value = []
  }

  return { scenario, events, recordEvent, resetScenario }
}
