import { deleteObject, getDownloadURL, getMetadata, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage'

export const WEBSITE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export interface StoredWebsiteFile { path: string; downloadUrl: string; contentType: string; size: number }

export class FirebaseStorageService {
  constructor(private readonly storage: FirebaseStorage) {}
  async upload(path: string, file: File): Promise<StoredWebsiteFile> {
    if (!WEBSITE_MEDIA_TYPES.includes(file.type as typeof WEBSITE_MEDIA_TYPES[number])) throw new Error('Only JPEG, PNG, WebP, and PDF files are supported.')
    const object = ref(this.storage, path)
    await uploadBytes(object, file, { contentType: file.type })
    return this.describe(path)
  }
  async describe(path: string): Promise<StoredWebsiteFile> {
    const object = ref(this.storage, path)
    const [metadata, downloadUrl] = await Promise.all([getMetadata(object), getDownloadURL(object)])
    return { path, downloadUrl, contentType: metadata.contentType ?? 'application/octet-stream', size: metadata.size }
  }
  async remove(path: string) { await deleteObject(ref(this.storage, path)) }
  async replace(path: string, file: File) { return this.upload(path, file) }
}
