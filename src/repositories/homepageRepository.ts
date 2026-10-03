import { getFirebaseServices, isFirebaseConfigured } from '../services/firebase/firebase'
import { createHomepageRepository } from './firebase/homepageRepository'
export function getHomepageRepository() {
  if (!isFirebaseConfigured()) throw new Error('관리자 기능이 아직 설정되지 않았습니다.')
  return createHomepageRepository(getFirebaseServices().firestore)
}
