import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { publicPages, site } from '../../content/site'

interface PageMetadata {
  title?: string
  description?: string
  noindex?: boolean
}

// One mounted route owns these head elements. Reuse the HTML fallback tags instead
// of adding duplicates; navigation always replaces the previous page's metadata.
export function usePageMetadata(overrides: PageMetadata = {}) {
  const { pathname } = useLocation()
  const path = pathname.replace(/\/+$/, '') || '/'
  const section = `/${path.split('/')[1]}`
  const page = publicPages[path] ?? publicPages[section]
  const isAdmin = path === '/admin' || path.startsWith('/admin/')
  const title = overrides.title
    ? `${overrides.title} | 스패닝트리`
    : page?.title ?? (isAdmin ? '관리자 | 스패닝트리' : '검색 | 스패닝트리')
  const description = overrides.description?.trim() || page?.description || site.description
  const noindex = overrides.noindex || !page || import.meta.env.VITE_SEO_NOINDEX === 'true'

  useEffect(() => {
    document.title = title
    function setMeta(name: string, content: string) {
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
      if (!tag) {
        tag = document.createElement('meta')
        tag.name = name
        document.head.append(tag)
      }
      tag.content = content
    }
    setMeta('description', description)
    setMeta('robots', noindex ? 'noindex, follow' : 'index, follow')
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (noindex) {
      canonical?.remove()
    } else {
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        document.head.append(canonical)
      }
      canonical.href = new URL(path, site.origin).href
    }
  }, [title, description, noindex, path])
}
