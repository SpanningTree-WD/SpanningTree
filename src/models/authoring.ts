import type { Attachment, MediaReference } from './common'

export interface ArticleAsset {
  id: string
  fileName: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
  size: number
  url: string
  alt?: string
  caption?: string
  width?: number
  align?: 'left' | 'center' | 'right'
}
export interface ReferenceEntry {
  id: string
  title?: string
  authors?: string
  year?: string
  source?: string
  url?: string
  doi?: string
  text?: string
}
export interface DiagramBlock {
  id: string
  language: 'tikz' | 'asymptote'
  source: string
  sourceHash?: string
  url?: string
  caption?: string
  alt?: string
}
export interface AuthoringFields {
  assets?: ArticleAsset[]
  diagrams?: DiagramBlock[]
  authorIds?: string[]
}
export interface AssetView extends Partial<ArticleAsset> {
  id: string
  fileName: string
  mediaType: ArticleAsset['mediaType']
  size: number
  previewUrl?: string
  state?: 'queued' | 'uploading' | 'processing' | 'ready' | 'failed'
  percent?: number
  error?: string
}
export const assetToken = (id: string) => `{{asset:${id}}}`
export const diagramToken = (id: string) => `{{diagram:${id}}}`
export const citationToken = (ids: string[]) => `[@${ids.join('; @')}]`
export const safeId = (id: string) => /^[a-zA-Z0-9_-]{1,128}$/.test(id)
export const safeLink = (value?: string) => !!value && /^(https?:\/\/|\/uploads\/)/i.test(value)
export function citationIds(text: string): string[] {
  return [...text.matchAll(/\[((?:@[a-zA-Z0-9_-]+\s*;?\s*)+)\]/g)]
    .flatMap(match => [...match[1].matchAll(/@([a-zA-Z0-9_-]+)/g)].map(item => item[1]))
}
export function removeCitation(text: string, id: string) {
  return text.replace(/\[((?:@[a-zA-Z0-9_-]+\s*;?\s*)+)\]/g, (token, contents: string) => {
    const ids = [...contents.matchAll(/@([a-zA-Z0-9_-]+)/g)].map(item => item[1])
    if (!ids.includes(id)) return token
    const remaining = ids.filter(value => value !== id)
    return remaining.length ? citationToken(remaining) : ''
  })
}
export function referenceLabel(ref: ReferenceEntry) {
  return ref.text?.trim() || [ref.authors, ref.title, ref.source, ref.year].filter(Boolean).join('. ')
}
export function referenceLink(ref: ReferenceEntry) {
  if (safeLink(ref.url) && /^https?:/i.test(ref.url!)) return ref.url
  const doi = ref.doi?.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
  return doi && /^10\.\d{4,9}\/\S+$/.test(doi) ? `https://doi.org/${encodeURI(doi)}` : undefined
}
export function validateAuthoring(input: AuthoringFields & { content?: string; description?: string; references?: ReferenceEntry[] }) {
  const body = input.content ?? input.description ?? ''
  const assets = input.assets ?? [], refs = input.references ?? [], diagrams = input.diagrams ?? []
  for (const list of [assets, refs, diagrams]) {
    if (list.length > 100 || list.some(item => !safeId(item.id)) || new Set(list.map(item => item.id)).size !== list.length)
      throw new Error('첨부·참고문헌·도형 항목을 확인해 주세요. 각각 최대 100개까지 사용할 수 있습니다.')
  }
  if (assets.some(asset => !/^\/uploads\/[a-f0-9]{64}\.(jpg|png|webp|pdf)$/.test(asset.url) ||
    !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(asset.mediaType) ||
    !Number.isFinite(asset.size) || asset.size < 0 || asset.size > 20971520 ||
    (asset.width !== undefined && (!Number.isFinite(asset.width) || asset.width < 10 || asset.width > 100)) ||
    (asset.align !== undefined && !['left', 'center', 'right'].includes(asset.align))))
    throw new Error('첨부 파일 정보가 올바르지 않습니다.')
  if (refs.some(ref => !referenceLabel(ref) || Object.values(ref).some(value => typeof value !== 'string' || value.length > 5000)))
    throw new Error('참고문헌의 제목 또는 자유 형식 내용을 입력해 주세요.')
  if (citationIds(body).some(id => !refs.some(ref => ref.id === id)))
    throw new Error('삭제되거나 없는 참고문헌을 가리키는 인용을 수정해 주세요.')
  if ([...body.matchAll(/\{\{asset:([a-zA-Z0-9_-]+)\}\}/g)].some(match => !assets.some(asset => asset.id === match[1])))
    throw new Error('본문에서 사용하는 첨부 파일을 확인해 주세요.')
  if ([...body.matchAll(/\{\{diagram:([a-zA-Z0-9_-]+)\}\}/g)].some(match => !diagrams.some(diagram => diagram.id === match[1] && diagram.url)))
    throw new Error('본문의 도형을 먼저 렌더링해 주세요.')
  if (diagrams.some(diagram => !['tikz', 'asymptote'].includes(diagram.language) || diagram.source.length > 20000 ||
    (diagram.url && !/^\/uploads\/[a-f0-9]{64}\.png$/.test(diagram.url))))
    throw new Error('도형 소스 또는 결과를 확인해 주세요.')
}

// Lossless, deterministic adaptation: old files remain in their original fields.
// No name-based People matching or destructive data migration occurs on read.
export function withLegacyAssets<T extends AuthoringFields & { coverImage: MediaReference; attachments?: Attachment[]; pdf?: Attachment }>(record: T): T {
  const assets = [...(record.assets ?? [])]
  const add = (url: string | undefined, fileName: string, mediaType: ArticleAsset['mediaType'], alt?: string) => {
    if (!url || !/^\/uploads\/[a-f0-9]{64}\.(jpg|png|webp|pdf)$/.test(url) || assets.some(asset => asset.url === url)) return
    assets.push({ id: 'legacy-' + url.split('/').pop()!.split('.')[0], fileName, mediaType, size: 0, url, alt, width: 100, align: 'center' })
  }
  const cover = record.coverImage
  add(cover.url, cover.alt || cover.url?.split('/').pop() || 'Image', cover.url?.endsWith('.png') ? 'image/png' : cover.url?.endsWith('.webp') ? 'image/webp' : 'image/jpeg', cover.alt)
  for (const file of [...(record.attachments ?? []), ...(record.pdf ? [record.pdf] : [])]) add(file.url, file.fileName, 'application/pdf')
  return { ...record, assets }
}
