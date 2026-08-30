export interface AdminAccessService {
  hasAccess(): boolean
  grant(password: string): boolean
  clear(): void
}

// Temporary workflow scaffolding only. This public client-side value is not authentication
// and provides no security. Replace this entire service when real auth is approved.
export const PROTOTYPE_ADMIN_PASSWORD = 'spanning-tree-prototype'
const SESSION_KEY = 'spanning-tree.prototype.admin-access'

export function createAdminAccessService(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): AdminAccessService {
  return {
    hasAccess: () => storage.getItem(SESSION_KEY) === 'granted',
    grant(password) { if (password !== PROTOTYPE_ADMIN_PASSWORD) return false; storage.setItem(SESSION_KEY, 'granted'); return true },
    clear: () => storage.removeItem(SESSION_KEY),
  }
}

export const adminAccessService = createAdminAccessService(window.sessionStorage)
