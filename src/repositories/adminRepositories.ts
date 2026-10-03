import type { Activity } from '../models/activity'
import type { Mathematics } from '../models/mathematics'
import type { Publication } from '../models/publication'
import type { AdminRepository } from './contracts'
import { getFirebaseServices } from '../services/firebase/firebase'
import { createFirebaseAdminRepository } from './firebase/adminRepository'

// Admin writes always use Firestore. They never fall back to localStorage.
function lazyRepository<T extends Activity | Mathematics | Publication>(
  name: 'activities' | 'mathematics' | 'publications'
): AdminRepository<T> {
  const get = () => createFirebaseAdminRepository<T>(getFirebaseServices().firestore, name)
  return {
    listAll: () => get().listAll(),
    getById: (id) => get().getById(id),
    create: (input, reservedId) => get().create(input, reservedId),
    update: (id, input) => get().update(id, input),
    publish: (id) => get().publish(id),
    unpublish: (id) => get().unpublish(id),
  }
}

export const activityRepository = lazyRepository<Activity>('activities')
export const mathematicsRepository = lazyRepository<Mathematics>('mathematics')
export const publicationRepository = lazyRepository<Publication>('publications')
