import type { AsymptoteEngine } from 'asymptote-web'
import { ASYMPTOTE_ASSETS } from './browserDiagramTypes'

let engine: AsymptoteEngine | undefined
// The same small RPC envelope as the pinned TikZJax worker. No DOM or credentials.
self.onmessage = async ({ data }: MessageEvent) => {
  if (data?.type !== 'run') return
  try {
    let payload: unknown
    if (data.method === 'load') {
      const base = new URL(ASYMPTOTE_ASSETS + '/', self.location.origin).href
      const moduleUrl = base + 'asymptote-web.js'
      const { createAsymptote, getAssetUrls } = await import(/* @vite-ignore */ moduleUrl) as typeof import('asymptote-web')
      engine = await createAsymptote(getAssetUrls(base))
    } else if (data.method === 'render' && engine) {
      const result = await engine.render(data.args[0], { format: 'svg', flags: ['-safe'], sourceFile: 'diagram.asy' })
      payload = { svg: result.svg, warnings: result.warnings }
    } else throw new Error('Unknown diagram operation')
    self.postMessage({ type: 'result', uid: data.uid, complete: true, payload })
  } catch (error) {
    self.postMessage({ type: 'error', uid: data.uid, error: { message: error instanceof Error ? error.message : String(error) } })
  }
}
self.postMessage({ type: 'init' })
