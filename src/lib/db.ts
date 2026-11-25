import type { DayEntry, Settings } from './types'

// Original app name, kept so existing data is not lost.
const DB_NAME = 'cyclusdagboek'
const DB_VERSION = 1
const ENTRIES = 'entries'
const META = 'meta'

let dbPromise: Promise<IDBDatabase> | undefined

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(ENTRIES)) db.createObjectStore(ENTRIES, { keyPath: 'date' })
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(stores: string[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => T): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode)
    const result = fn(t)
    t.oncomplete = () => resolve(result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

export async function loadAll(): Promise<{ entries: DayEntry[]; settings?: Partial<Settings> }> {
  const db = await openDb()
  const t = db.transaction([ENTRIES, META], 'readonly')
  const [entries, settings] = await Promise.all([
    promisify(t.objectStore(ENTRIES).getAll() as IDBRequest<DayEntry[]>),
    promisify(t.objectStore(META).get('settings') as IDBRequest<Partial<Settings> | undefined>),
  ])
  return { entries, settings }
}

export const putEntry = (entry: DayEntry) => tx([ENTRIES], 'readwrite', (t) => void t.objectStore(ENTRIES).put(entry))

export const deleteEntry = (date: string) => tx([ENTRIES], 'readwrite', (t) => void t.objectStore(ENTRIES).delete(date))

export const putSettings = (settings: Settings) =>
  tx([META], 'readwrite', (t) => void t.objectStore(META).put(settings, 'settings'))

/** Replace everything in a single transaction. */
export const replaceAll = (entries: DayEntry[], settings: Settings) =>
  tx([ENTRIES, META], 'readwrite', (t) => {
    const store = t.objectStore(ENTRIES)
    store.clear()
    for (const e of entries) store.put(e)
    t.objectStore(META).put(settings, 'settings')
  })

export const putEntries = (entries: DayEntry[]) =>
  tx([ENTRIES], 'readwrite', (t) => {
    const store = t.objectStore(ENTRIES)
    for (const e of entries) store.put(e)
  })

export async function requestPersistence(): Promise<boolean | undefined> {
  if (!navigator.storage?.persist) return undefined
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}

export async function isPersisted(): Promise<boolean | undefined> {
  return navigator.storage?.persisted ? navigator.storage.persisted() : undefined
}
