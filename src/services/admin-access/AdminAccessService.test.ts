import { describe, expect, it } from 'vitest'
import { createAdminAccessService, PROTOTYPE_ADMIN_PASSWORD } from './AdminAccessService'

describe('prototype admin access service', () => {
  it('grants and clears access only in the supplied session storage', () => {
    const values = new Map<string, string>()
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }
    const service = createAdminAccessService(storage)
    expect(service.grant('wrong')).toBe(false)
    expect(service.hasAccess()).toBe(false)
    expect(service.grant(PROTOTYPE_ADMIN_PASSWORD)).toBe(true)
    expect(service.hasAccess()).toBe(true)
    service.clear()
    expect(service.hasAccess()).toBe(false)
  })
})
