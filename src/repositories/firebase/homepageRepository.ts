import { doc, getDocFromServer, onSnapshot, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore'
import { defaultHomepage, validateHomepage, type HomepageSettings } from '../../models/homepage'
export interface HomepageRevision { draft: number; published: number }
export interface HomepageEditorState {
  settings: HomepageSettings
  revision: HomepageRevision
}
function read(data: Record<string, unknown> | undefined) {
  return data ? validateHomepage(data.settings as HomepageSettings) : defaultHomepage
}
export function createHomepageRepository(db: Firestore) {
  const published = doc(db, 'siteSettings', 'homepage')
  const draft = doc(db, 'siteDrafts', 'homepage')
  return {
    subscribe(next: (value: HomepageSettings) => void, error: (error: Error) => void) {
      return onSnapshot(published, (snapshot) => {
        try { next(read(snapshot.data())) } catch (failure) { error(failure as Error) }
      }, error)
    },
    async loadEditor(): Promise<HomepageEditorState> {
      const [d, p] = await Promise.all([getDocFromServer(draft), getDocFromServer(published)])
      return { settings: read(d.exists() ? d.data() : p.data()), revision: { draft: d.data()?.revision ?? 0, published: p.data()?.revision ?? 0 } }
    },
    async save(settings: HomepageSettings, expected: HomepageRevision, publish: boolean): Promise<HomepageEditorState> {
      const clean = validateHomepage(settings)
      return runTransaction(db, async (transaction) => {
        const d = await transaction.get(draft)
        const p = await transaction.get(published)
        const revision = { draft: d.data()?.revision ?? 0, published: p.data()?.revision ?? 0 }
        if (revision.draft !== expected.draft || revision.published !== expected.published)
          throw new Error('다른 관리자가 설정을 변경했습니다. 입력 내용을 복사해 두고 다시 불러와 주세요.')
        revision.draft++
        transaction.set(draft, { settings: clean, revision: revision.draft, updatedAt: serverTimestamp() })
        if (publish) {
          revision.published++
          transaction.set(published, { settings: clean, revision: revision.published, updatedAt: serverTimestamp() })
        }
        return { settings: clean, revision }
      })
    },
  }
}
