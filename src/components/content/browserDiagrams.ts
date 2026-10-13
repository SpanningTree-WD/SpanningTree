import type { DiagramBlock } from '../../models/authoring'
import { TIKZ_ASSETS } from '../../services/diagrams/browserDiagramTypes'

let fonts: Promise<void> | undefined
export function loadDiagramFonts(language: DiagramBlock['language']) {
  if (language !== 'tikz') return Promise.resolve()
  return fonts ??= new Promise<void>((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'; link.href = TIKZ_ASSETS + '/fonts.css'
    const timer = setTimeout(fail, 15000)
    function fail() { clearTimeout(timer); link.remove(); fonts = undefined; reject(new Error('도형 글꼴을 불러오지 못했습니다. 다시 시도해 주세요.')) }
    link.onload = () => { clearTimeout(timer); resolve() }
    link.onerror = fail
    document.head.append(link)
  })
}

/** Shared by the public reader, article preview and CodeMirror widgets. */
export function hydrateBrowserDiagrams(root: HTMLElement, diagrams: DiagramBlock[], t: (value: string) => string) {
  const cleanups: (() => void)[] = []
  for (const figure of root.querySelectorAll<HTMLElement>('[data-browser-diagram]')) {
    const diagram = diagrams.find(item => item.id === figure.dataset.browserDiagram && item.renderer === 'browser-v1')
    const output = figure.querySelector<HTMLElement>('.browser-diagram-output')
    if (!diagram || !output) continue
    let controller: AbortController | undefined, disposed = false
    const render = async () => {
      controller?.abort(); controller = new AbortController()
      const signal = controller.signal
      const status = document.createElement('p')
      status.setAttribute('role', 'status'); status.textContent = t('도형을 그리는 중…')
      output.replaceChildren(status)
      try {
        const [{ renderBrowserDiagram }] = await Promise.all([import('../../services/diagrams/browserDiagramService'), loadDiagramFonts(diagram.language)])
        const result = await renderBrowserDiagram(diagram.language, diagram.source, { signal })
        if (disposed || signal.aborted) return
        output.innerHTML = result.svg
        output.querySelector('svg')?.setAttribute('aria-label', diagram.alt || diagram.caption || diagram.language)
      } catch (error) {
        if (disposed || signal.aborted) return
        status.textContent = t(error instanceof Error ? error.message : '도형을 컴파일하지 못했습니다.')
        status.setAttribute('role', 'alert')
        const retry = document.createElement('button')
        retry.type = 'button'; retry.textContent = t('재시도'); retry.onclick = () => { void render() }
        output.replaceChildren(status, retry)
      }
    }
    let observer: IntersectionObserver | undefined
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { observer?.disconnect(); void render() }
      }, { rootMargin: '200px' })
      observer.observe(figure)
    } else void render()
    cleanups.push(() => { disposed = true; observer?.disconnect(); controller?.abort() })
  }
  return () => cleanups.forEach(cleanup => cleanup())
}
