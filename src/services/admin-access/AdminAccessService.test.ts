import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import { onSnapshot, type Firestore } from 'firebase/firestore'
import { createAdminAccessService } from './AdminAccessService'

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  setPersistence: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  browserSessionPersistence: 'session',
  GoogleAuthProvider: class {
    setCustomParameters = vi.fn()
  },
}))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => 'membership'), onSnapshot: vi.fn() }))

const user = { uid: 'member-1', email: 'member@example.com', emailVerified: true } as User
const service = () => createAdminAccessService({} as Auth, {} as Firestore)
let authCallback: (user: User | null) => void
let membershipCallback: (snapshot: unknown) => void
let membershipError: () => void
let stopAuth: ReturnType<typeof vi.fn>, stopMembership: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  stopAuth = vi.fn()
  stopMembership = vi.fn()
  vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
    authCallback = callback as typeof authCallback
    return stopAuth
  })
  vi.mocked(onSnapshot).mockImplementation((...args: unknown[]) => {
    membershipCallback = args[2] as typeof membershipCallback
    membershipError = args[3] as typeof membershipError
    return stopMembership
  })
})
const membership = (enabled: boolean, fromCache = false) => ({
  exists: () => true,
  data: () => ({ enabled }),
  metadata: { fromCache },
})

describe('Firebase admin access', () => {
  it('uses session persistence and Google login; logout delegates to Auth', async () => {
    const access = service()
    await access.signIn()
    expect(setPersistence).toHaveBeenCalledWith({}, 'session')
    expect(signInWithPopup).toHaveBeenCalledOnce()
    await access.signOut()
    expect(signOut).toHaveBeenCalledOnce()
  })
  it('requires server-confirmed membership and reacts to revocation and logout', () => {
    const listener = vi.fn()
    const stop = service().subscribe(listener)
    authCallback(null)
    expect(listener).toHaveBeenLastCalledWith({ status: 'signed-out' })
    authCallback(user)
    membershipCallback(membership(true, true))
    expect(listener).toHaveBeenLastCalledWith({ status: 'loading' })
    membershipCallback(membership(true))
    expect(listener).toHaveBeenLastCalledWith({
      status: 'authorized',
      user: { uid: user.uid, email: user.email },
    })
    membershipCallback(membership(false))
    expect(listener).toHaveBeenLastCalledWith({
      status: 'denied',
      user: { uid: user.uid, email: user.email },
    })
    const stale = membershipCallback
    authCallback(null)
    stale(membership(true))
    expect(listener).toHaveBeenLastCalledWith({ status: 'signed-out' })
    stop()
    expect(stopAuth).toHaveBeenCalled()
    expect(stopMembership).toHaveBeenCalled()
  })
  it('denies unverified accounts and missing membership; fails closed on lookup errors', () => {
    const listener = vi.fn()
    service().subscribe(listener)
    authCallback({ ...user, emailVerified: false } as User)
    expect(onSnapshot).not.toHaveBeenCalled()
    expect(listener.mock.lastCall?.[0].status).toBe('denied')
    authCallback(user)
    membershipCallback({ exists: () => false, metadata: { fromCache: false } })
    expect(listener.mock.lastCall?.[0].status).toBe('denied')
    membershipError()
    expect(listener.mock.lastCall?.[0].status).toBe('error')
  })
})
