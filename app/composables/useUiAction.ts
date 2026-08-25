interface ActionGuard {
  allowed: boolean
  reason?: string
}

export function useUiAction() {
  const toast = useToast()

  async function run(guard: ActionGuard, action: () => Promise<void> | void) {
    if (!guard.allowed) {
      toast.add({ title: 'ยังดำเนินการไม่ได้', description: guard.reason || 'สถานะปัจจุบันไม่รองรับรายการนี้', color: 'warning' })
      return false
    }

    try {
      await action()
      return true
    } catch (error: unknown) {
      toast.add({ title: 'ดำเนินการไม่สำเร็จ', description: error instanceof Error ? error.message : 'โปรดลองอีกครั้ง', color: 'error' })
      return false
    }
  }

  return { run }
}

