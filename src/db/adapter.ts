import { openDB as idbOpenDB, type IDBPDatabase } from 'idb'
import type { AppState } from '../types'

const DB_NAME = 'adhd-todo'
const DB_VERSION = 1
const STORE_NAME = 'appState'
const STATE_KEY = 'state'

const DEFAULT_STATE: AppState = {
  tasks: [],
  settings: { allowOverlap: false },
}

let dbInstance: IDBPDatabase | null = null

export async function openDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance
  dbInstance = await idbOpenDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
  return dbInstance
}

export async function hydrate(): Promise<AppState> {
  const db = await openDB()
  // idb's get() returns unknown without a typed schema; cast is safe here since
  // persist() always writes AppState to this key
  const stored = (await db.get(STORE_NAME, STATE_KEY)) as AppState | undefined
  return stored ?? DEFAULT_STATE
}

export async function persist(state: AppState): Promise<void> {
  const db = await openDB()
  await db.put(STORE_NAME, state, STATE_KEY)
}
