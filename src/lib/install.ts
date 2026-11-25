import { useSyncExternalStore } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as BeforeInstallPromptEvent
  emit()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  emit()
})

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export { isIOS, isStandalone } from './platform'

/** Returns a function to show the browser's install dialog, or null when not available. */
export function useInstallPrompt(): (() => Promise<void>) | null {
  const event = useSyncExternalStore(subscribe, () => deferred)
  if (!event) return null
  return async () => {
    await event.prompt()
    await event.userChoice
    deferred = null
    emit()
  }
}
