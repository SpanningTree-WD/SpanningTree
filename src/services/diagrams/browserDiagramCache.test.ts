import { afterEach, expect, it, vi } from 'vitest'
import { readDiagramCache } from './browserDiagramCache'

afterEach(() => vi.unstubAllGlobals())

it('allows rendering when the browser blocks IndexedDB', async () => {
  vi.stubGlobal('indexedDB', { open() { throw new DOMException('Blocked', 'SecurityError') } })
  await expect(readDiagramCache('blocked')).resolves.toBeUndefined()
})

it('allows rendering when a database opens but cannot start a transaction', async () => {
  const close = vi.fn()
  const request = { result: { close, transaction() { throw new DOMException('Unavailable', 'InvalidStateError') } }, onsuccess: () => {} }
  vi.stubGlobal('indexedDB', { open() { queueMicrotask(() => request.onsuccess()); return request } })
  await expect(readDiagramCache('unavailable')).resolves.toBeUndefined()
  expect(close).toHaveBeenCalled()
})
