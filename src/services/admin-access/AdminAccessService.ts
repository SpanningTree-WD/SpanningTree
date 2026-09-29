import {
  browserSessionPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth,
} from 'firebase/auth'
import { doc, onSnapshot, type Firestore } from 'firebase/firestore'
import { getFirebaseServices } from '../firebase/firebase'

export interface AdminUser {
  uid: string
  email: string | null
}
export type AdminAccessState =
  | { status: 'loading' | 'signed-out' }
  | { status: 'authorized' | 'denied'; user: AdminUser }
  | { status: 'error'; message: string }

export interface AdminAccessService {
  subscribe(listener: (state: AdminAccessState) => void): () => void
  signIn(): Promise<void>
  signOut(): Promise<void>
}

export function createAdminAccessService(auth: Auth, firestore: Firestore): AdminAccessService {
  return {
    subscribe(listener) {
      let stopMembership: (() => void) | undefined
      let generation = 0
      listener({ status: 'loading' })
      const stopAuth = onAuthStateChanged(
        auth,
        (user) => {
          const current = ++generation
          stopMembership?.()
          if (!user) {
            listener({ status: 'signed-out' })
            return
          }
          const identity = { uid: user.uid, email: user.email }
          if (!user.emailVerified) {
            listener({ status: 'denied', user: identity })
            return
          }
          listener({ status: 'loading' })
          // Wait for server confirmation; a cached allowlist must not admit an offline session.
          stopMembership = onSnapshot(
            doc(firestore, 'admins', user.uid),
            { includeMetadataChanges: true },
            (snapshot) => {
              if (current !== generation) return
              if (snapshot.metadata.fromCache) {
                listener({ status: 'loading' })
                return
              }
              listener({
                status:
                  snapshot.exists() && snapshot.data().enabled === true ? 'authorized' : 'denied',
                user: identity,
              })
            },
            () => {
              if (current === generation)
                listener({
                  status: 'error',
                  message:
                    '관리자 권한을 확인하지 못했습니다. 연결을 확인하고 다시 로그인해 주세요.',
                })
            }
          )
        },
        () => {
          generation++
          stopMembership?.()
          listener({
            status: 'error',
            message: '로그인 상태를 확인하지 못했습니다. 다시 시도해 주세요.',
          })
        }
      )
      return () => {
        generation++
        stopMembership?.()
        stopAuth()
      }
    },
    async signIn() {
      await setPersistence(auth, browserSessionPersistence)
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    },
    async signOut() {
      await signOut(auth)
    },
  }
}

// Lazy initialization keeps the public fixture preview usable without Firebase configuration.
let service: AdminAccessService | undefined
export function getAdminAccessService() {
  if (!service) {
    const { auth, firestore } = getFirebaseServices()
    service = createAdminAccessService(auth, firestore)
  }
  return service
}
