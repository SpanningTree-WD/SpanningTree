import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

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

let services: { app: FirebaseApp; firestore: Firestore; storage: FirebaseStorage } | undefined

export function getFirebaseServices() {
  if (!services) {
    requireFirebaseConfig()
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    services = { app, firestore: getFirestore(app), storage: getStorage(app) }
  }
  return services
}
