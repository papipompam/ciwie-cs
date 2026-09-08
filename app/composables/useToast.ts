export interface ToastMessage {
  id: string
  title: string
  description?: string
}

export const useToast = () => {
  const messages = useState<ToastMessage[]>('toast-messages', () => [])

  const showToast = (message: Omit<ToastMessage, 'id'>) => {
    messages.value.push({ ...message, id: crypto.randomUUID() })
  }

  const dismissToast = (id: string) => {
    messages.value = messages.value.filter(message => message.id !== id)
  }

  return { messages, showToast, dismissToast }
}
