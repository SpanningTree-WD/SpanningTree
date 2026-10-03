import { createHash } from 'node:crypto'
import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import { compileDiagram, ENGINE, sourceHash } from './compile'
export interface DiagramManifest { kind: 'diagram'; uid: string; uploadId: string; url: string; sha256: string; size: number }
export async function processDiagrams(db: Firestore, storeFile: (path: string, bytes: Buffer) => Promise<void>, compilerAvailable = true): Promise<DiagramManifest[]> {
  const snapshots = await db.collection('diagramRequests').where('state', 'in', ['queued', 'processing', 'committed']).limit(10).get()
  const manifest: DiagramManifest[] = []
  for (const snapshot of snapshots.docs) {
    const data = snapshot.data()
    try {
      if (!['activities', 'mathematics', 'publications'].includes(data.collection) ||
          typeof data.recordId !== 'string' || !/^[a-zA-Z0-9_-]{1,180}$/.test(data.recordId) ||
          !['tikz', 'asymptote'].includes(data.language) || typeof data.source !== 'string' ||
          !data.source.trim() || data.source.length > 20000 || !/^[a-f0-9]{64}$/.test(data.sourceHash))
        throw new Error('Invalid diagram request.')
      const [admin, record, session] = await Promise.all([
        db.doc('admins/' + snapshot.id).get(),
        db.doc(data.collection + '/' + data.recordId).get(),
        db.doc('uploadSessions/' + snapshot.id + '/records/' + data.recordId).get(),
      ])
      if (admin.data()?.enabled !== true || data.ownerId !== snapshot.id ||
        (!record.exists && !(session.data()?.collection === data.collection && session.data()?.expiresAt?.toMillis() > Date.now())))
        throw new Error('관리자 권한 또는 작성 중인 글이 더 이상 유효하지 않습니다.')
      if (data.engine !== ENGINE || data.sourceHash !== sourceHash(data.language, data.source))
        throw new Error('도형 소스 검증에 실패했습니다.')
      if (data.state === 'committed' && data.url && data.sha256 && data.size) {
        manifest.push({ kind: 'diagram', uid: snapshot.id, uploadId: data.requestId, url: data.url, sha256: data.sha256, size: data.size })
        continue
      }
      // A request can arrive after the workflow's queue probe. Leave it queued
      // for the next run instead of failing because no compiler image was built.
      if (!compilerAvailable) continue
      await snapshot.ref.update({ state: 'processing', updatedAt: FieldValue.serverTimestamp() })
      const cacheRef = db.doc('diagramCache/' + data.sourceHash)
      const cached = await cacheRef.get()
      let file = cached.exists ? cached.data() as { url: string; sha256: string; size: number } : undefined
      if (!file) {
        const png = await compileDiagram(data.language, data.source)
        const sha256 = createHash('sha256').update(png).digest('hex')
        file = { url: '/uploads/' + sha256 + '.png', sha256, size: png.length }
        await storeFile('public' + file.url, png)
        await cacheRef.set({ ...file, engine: ENGINE, createdAt: FieldValue.serverTimestamp() })
      }
      await snapshot.ref.update({ ...file, state: 'committed', updatedAt: FieldValue.serverTimestamp() })
      manifest.push({ kind: 'diagram', uid: snapshot.id, uploadId: data.requestId, ...file })
    } catch (error) {
      await snapshot.ref.update({ state: 'failed', error: (error instanceof Error ? error.message : 'Compilation failed.').slice(-5500), updatedAt: FieldValue.serverTimestamp() })
    }
  }
  return manifest
}
