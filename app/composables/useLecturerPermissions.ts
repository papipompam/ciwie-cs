export type LecturerFeature = 'placements'

const defaults: Record<string, Record<LecturerFeature, boolean>> = {
  'lecturer-001': { placements: true },
  'lecturer-999': { placements: false },
}

export const useLecturerPermissions = () => {
  const permissions = useState<Record<string, Record<LecturerFeature, boolean>>>('lecturer-permissions', () => structuredClone(defaults))
  const { currentAccount } = useAuthPrototype()

  const normalizeId = (id: string) => id === 'lecturer-001' ? 'L0012' : id
  const getPermissions = (id: string) => permissions.value[normalizeId(id)] ?? { placements: false }
  const canAccess = (feature: LecturerFeature = 'placements') => currentAccount.value?.role === 'lecturer' && getPermissions(currentAccount.value.id)[feature]
  const setPermission = (id: string, enabled: boolean) => {
    permissions.value[normalizeId(id)] = { placements: enabled }
  }

  return { getPermissions, canAccess, setPermission }
}
