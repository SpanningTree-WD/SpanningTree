import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage'

const env = import.meta.env
const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

function requireFirebaseConfig() {
  const missing = Object.entries(firebaseConfig).filter(([, value]) => !value).map(([key]) => key)
  if (missing.length) throw new Error(`Firebase mode requires configuration: ${missing.join(', ')}`)
}

export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every(Boolean)
}

let services: { app: FirebaseApp; auth: Auth; firestore: Firestore; storage: FirebaseStorage } | undefined

export function getFirebaseServices() {
  if (!services) {
    requireFirebaseConfig()
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const firestore = getFirestore(app)
    const storage = getStorage(app)
    // Emulators are opt-in and only available in a local development build.
    if (env.DEV && env.VITE_USE_FIREBASE_EMULATORS === 'true') {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099')
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
      connectStorageEmulator(storage, '127.0.0.1', 9199)
    }
    services = { app, auth, firestore, storage }
  }
  return services
}
