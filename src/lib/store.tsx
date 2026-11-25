import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildCycleModel, type CycleModel } from './cycle'
import * as db from './db'
import { today as getToday } from './date'
import { clean, isMeaningful, mergeEntry, normalizeSettings } from './entries'
import { scheduledMeds } from './meds'
import type { DayEntry, ISODate, Settings } from './types'

interface Store {
  loaded: boolean
  error?: string
  today: ISODate
  entries: Map<ISODate, DayEntry>
  settings: Settings
  cycle: CycleModel
  updateEntry(date: ISODate, update: (e: DayEntry) => DayEntry): void
  updateSettings(update: (s: Settings) => Settings): void
  mergeEntries(entries: DayEntry[]): Promise<void>
  replaceAll(entries: DayEntry[], settings: Settings): Promise<void>
}

const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore outside StoreProvider')
  return ctx
}

function useToday(): ISODate {
  const [value, setValue] = useState(getToday)
  useEffect(() => {
    const check = () => setValue(getToday())
    const id = window.setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])
  return value
}

export function StoreProvider({ children, onError }: { children: ReactNode; onError: (msg: string) => void }) {
  const today = useToday()
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string>()
  const [entries, setEntries] = useState(() => new Map<ISODate, DayEntry>())
  const [settings, setSettings] = useState(() => normalizeSettings())

  // Refs keep the latest values available to callbacks without re-creating them.
  const entriesRef = useRef(entries)
  const settingsRef = useRef(settings)
  entriesRef.current = entries
  settingsRef.current = settings

  useEffect(() => {
    db.loadAll()
      .then(({ entries, settings }) => {
        setEntries(new Map(entries.map((e) => [e.date, e])))
        setSettings(normalizeSettings(settings))
        setLoaded(true)
        void db.requestPersistence()
      })
      .catch((e) => setError(String(e?.message ?? e)))
  }, [])

  const persistFailed = useCallback((e: unknown) => onError(`Opslaan mislukt: ${String((e as Error)?.message ?? e)}`), [onError])

  const updateEntry = useCallback(
    (date: ISODate, update: (e: DayEntry) => DayEntry) => {
      const meds = settingsRef.current.meds
      const current = entriesRef.current.get(date)
      const base: DayEntry = current ?? { date, updatedAt: 0 }
      const updated = update(base)
      // Snapshot the medication of that day, so later schedule changes don't rewrite history.
      const next = clean({ ...updated, meds: { ...scheduledMeds(meds, date), ...updated.meds }, updatedAt: Date.now() })
      const map = new Map(entriesRef.current)
      if (isMeaningful(next, meds)) {
        map.set(date, next)
        db.putEntry(next).catch(persistFailed)
      } else {
        map.delete(date)
        if (current) db.deleteEntry(date).catch(persistFailed)
      }
      entriesRef.current = map
      setEntries(map)
    },
    [persistFailed],
  )

  const updateSettings = useCallback(
    (update: (s: Settings) => Settings) => {
      const next = update(settingsRef.current)
      settingsRef.current = next
      setSettings(next)
      db.putSettings(next).catch(persistFailed)
    },
    [persistFailed],
  )

  const mergeEntries = useCallback(async (incoming: DayEntry[]) => {
    const map = new Map(entriesRef.current)
    const changed: DayEntry[] = []
    for (const e of incoming) {
      const merged = mergeEntry(map.get(e.date), clean(e))
      map.set(e.date, merged)
      changed.push(merged)
    }
    await db.putEntries(changed)
    entriesRef.current = map
    setEntries(map)
  }, [])

  const replaceAll = useCallback(async (all: DayEntry[], s: Settings) => {
    const normalized = normalizeSettings(s)
    const cleaned = all.map(clean)
    await db.replaceAll(cleaned, normalized)
    const map = new Map(cleaned.map((e) => [e.date, e]))
    entriesRef.current = map
    settingsRef.current = normalized
    setEntries(map)
    setSettings(normalized)
  }, [])

  const cycle = useMemo(() => buildCycleModel(entries, settings, today), [entries, settings, today])

  const value = useMemo<Store>(
    () => ({ loaded, error, today, entries, settings, cycle, updateEntry, updateSettings, mergeEntries, replaceAll }),
    [loaded, error, today, entries, settings, cycle, updateEntry, updateSettings, mergeEntries, replaceAll],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
