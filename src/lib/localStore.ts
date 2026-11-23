import { useSyncExternalStore } from 'react'

export interface Store<T> {
  get: () => T
  set: (next: T) => void
  subscribe: (listener: () => void) => () => void
}

export function createLocalStore<T>(key: string, fallback: T, onChange?: (value: T) => void): Store<T> {
  let value = fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw) value = JSON.parse(raw) as T
  } catch {
    value = fallback
  }
  const listeners = new Set<() => void>()
  onChange?.(value)
  return {
    get: () => value,
    set(next) {
      value = next
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // penyimpanan penuh atau diblokir: nilai tetap berlaku selama sesi
      }
      onChange?.(next)
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get)
}
