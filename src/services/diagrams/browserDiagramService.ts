import type { DiagramBlock } from '../../models/authoring'
import { readDiagramCache, writeDiagramCache } from './browserDiagramCache'
import { ASYMPTOTE_ASSETS, BROWSER_DIAGRAM_ENGINE, TIKZ_ASSETS, TIKZ_OPTIONS, type BrowserDiagramResult } from './browserDiagramTypes'
import { sanitizeDiagramSvg } from './diagramSvg'

type Language = DiagramBlock['language']
const aborted = () => new DOMException('Aborted', 'AbortError')
export const DIAGRAM_TIMEOUT = '도형 렌더링 시간이 초과되었습니다. 소스를 확인한 뒤 재시도해 주세요.'

class Compiler {
  private worker?: Worker
  private ready?: Promise<void>
  private nextId = 0
  private queue: Promise<unknown> = Promise.resolve()
  constructor(private language: Language) {}
  private reset() { this.worker?.terminate(); this.worker = undefined; this.ready = undefined }
  private wait<T>(signal: AbortSignal, timeout: number, listen: (resolve: (value: T) => void, reject: (error: Error) => void) => () => void): Promise<T> {
    return new Promise((resolve, reject) => {
      let unsubscribe = () => {}
      const finish = (error?: Error, value?: T) => {
        clearTimeout(timer); signal.removeEventListener('abort', onAbort); unsubscribe()
        if (error) reject(error); else resolve(value as T)
      }
      const onAbort = () => finish(aborted())
      const timer = setTimeout(() => finish(new Error(DIAGRAM_TIMEOUT)), timeout)
      signal.addEventListener('abort', onAbort, { once: true })
      unsubscribe = listen(value => finish(undefined, value), error => finish(error))
      if (signal.aborted) onAbort()
    })
  }
  private rpc<T>(method: string, args: unknown[], signal: AbortSignal, timeout: number) {
    return this.wait<T>(signal, timeout, (resolve, reject) => {
      const worker = this.worker!, uid = ++this.nextId
      let diagnostics = ''
      const message = ({ data }: MessageEvent) => {
        if (typeof data === 'string') { diagnostics = (diagnostics + '\n' + data).slice(-16000); return }
        if (data?.uid !== uid && data?.type !== 'uncaughtError') return
        if (data.type === 'result' && data.complete) {
          const failure = diagnostics.match(/(?:^|\n)!\s[\s\S]*/)
          if (failure) reject(new Error(failure[0].trim().slice(0, 4000)))
          else resolve(data.payload)
        }
        if (data.type === 'error' || data.type === 'uncaughtError') reject(new Error(String(data.error?.message ?? '도형을 컴파일하지 못했습니다.').slice(0, 4000)))
      }
      const error = () => reject(new Error('도형 엔진을 불러오지 못했습니다. 연결을 확인하고 재시도해 주세요.'))
      worker.addEventListener('message', message); worker.addEventListener('error', error)
      worker.postMessage({ type: 'run', uid, method, args })
      return () => { worker.removeEventListener('message', message); worker.removeEventListener('error', error) }
    })
  }
  private async initialize(signal: AbortSignal, timeout: number) {
    this.worker = this.language === 'tikz' ? new Worker(TIKZ_ASSETS + '/run-tex.js') : new Worker(new URL('./asymptote.worker.ts', import.meta.url), { type: 'module' })
    await this.wait<void>(signal, timeout, (resolve, reject) => {
      const worker = this.worker!
      const message = ({ data }: MessageEvent) => { if (data?.type === 'init') resolve() }
      const error = () => reject(new Error('도형 엔진을 불러오지 못했습니다. 연결을 확인하고 재시도해 주세요.'))
      worker.addEventListener('message', message); worker.addEventListener('error', error)
      return () => { worker.removeEventListener('message', message); worker.removeEventListener('error', error) }
    })
    await this.rpc('load', [new URL(TIKZ_ASSETS, location.origin).href], signal, timeout)
  }
  render(source: string, hash: string, signal: AbortSignal, timeout: number) {
    const task = this.queue.then(async () => {
      if (signal.aborted) throw aborted()
      const cached = await readDiagramCache(hash)
      if (signal.aborted) throw aborted()
      if (cached) return { ...cached, svg: sanitizeDiagramSvg(cached.svg) }
      try {
        this.ready ??= this.initialize(signal, timeout)
        await this.ready
        const output = this.language === 'tikz'
          ? { svg: await this.rpc<string>('texify', [source, TIKZ_OPTIONS], signal, timeout), warnings: [] }
          : await this.rpc<{ svg: string; warnings: string[] }>('render', [source], signal, timeout)
        let svg = sanitizeDiagramSvg(output.svg)
        if (this.language === 'asymptote') {
          const { renderAsymptoteLabels } = await import('./asymptoteLabels')
          svg = sanitizeDiagramSvg(renderAsymptoteLabels(svg))
        }
        const result = { ...output, sourceHash: hash, svg: sanitizeDiagramSvg(svg, 'diagram-' + hash) }
        if (signal.aborted) throw aborted()
        void writeDiagramCache(result).catch(() => {})
        return result
      } catch (error) { this.reset(); throw error }
    })
    this.queue = task.catch(() => {})
    return task
  }
}
const compilers = { tikz: new Compiler('tikz'), asymptote: new Compiler('asymptote') }

export async function browserDiagramHash(language: Language, source: string) {
  const bytes = new TextEncoder().encode(JSON.stringify([BROWSER_DIAGRAM_ENGINE, 'labels-v1', TIKZ_ASSETS, ASYMPTOTE_ASSETS, TIKZ_OPTIONS, language, source]))
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
export async function renderBrowserDiagram(language: Language, source: string, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<BrowserDiagramResult> {
  if (!source.trim() || source.length > 20000) throw new Error('도형 소스는 1~20,000자로 입력해 주세요.')
  if (!compilers[language]) throw new Error('지원하지 않는 도형 언어입니다.')
  const signal = options.signal ?? new AbortController().signal
  if (signal.aborted) throw aborted()
  const hash = await browserDiagramHash(language, source)
  return compilers[language].render(source, hash, signal, options.timeoutMs ?? 30000)
}
