import type { BrowserDiagramResult } from './browserDiagramTypes'

const memory = new Map<string, BrowserDiagramResult>()
const MAX_ENTRIES = 32
// A blocked/private-mode database must never prevent rendering.
async function database(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === 'undefined') return undefined
  return new Promise(resolve => {
    let done = false
    const finish = (db?: IDBDatabase) => { if (done) { db?.close(); return }; done = true; clearTimeout(timer); resolve(db) }
    const timer = setTimeout(() => finish(), 500)
    try {
      const request = indexedDB.open('spanning-tree-diagrams-v1', 1)
      request.onupgradeneeded = () => { request.result.createObjectStore('results', { keyPath: 'sourceHash' }) }
      request.onsuccess = () => finish(request.result)
      request.onerror = request.onblocked = () => finish()
    } catch { finish() }
  })
}
export async function readDiagramCache(key: string): Promise<BrowserDiagramResult | undefined> {
  if (memory.has(key)) return memory.get(key)
  const db = await database()
  if (!db) return undefined
  return new Promise(resolve => {
    const finish = (value?: BrowserDiagramResult) => {
      clearTimeout(timer); db.close(); resolve(value)
    }
    const timer = setTimeout(() => finish(), 500)
    try {
      const request = db.transaction('results').objectStore('results').get(key)
      request.onsuccess = () => {
        const value = request.result
        finish(value?.sourceHash === key && typeof value.svg === 'string' && value.svg.length <= 2_000_000 &&
          Array.isArray(value.warnings) && value.warnings.every((warning: unknown) => typeof warning === 'string') ? value : undefined)
      }
      request.onerror = () => finish()
    } catch { finish() }
  })
}
export async function writeDiagramCache(value: BrowserDiagramResult) {
  memory.delete(value.sourceHash)
  if (memory.size >= MAX_ENTRIES) memory.delete(memory.keys().next().value!)
  memory.set(value.sourceHash, value)
  const db = await database()
  if (!db) return
  try {
    const tx = db.transaction('results', 'readwrite'), store = tx.objectStore('results')
    store.put({ ...value, savedAt: Date.now() })
    const all = store.getAll()
    all.onsuccess = () => {
      const rows = all.result.sort((a, b) => b.savedAt - a.savedAt)
      let bytes = 0
      rows.forEach((row, index) => { bytes += row.svg.length * 2; if (index >= MAX_ENTRIES || bytes > 8_000_000) store.delete(row.sourceHash) })
    }
    tx.oncomplete = tx.onerror = tx.onabort = () => db.close()
  } catch { db.close() }
}
