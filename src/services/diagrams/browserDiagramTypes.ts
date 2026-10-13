export const BROWSER_DIAGRAM_ENGINE = 'browser-v1' as const
export const TIKZ_ASSETS = '/vendor/diagrams/tikzjax-1.6.0-st1'
export const ASYMPTOTE_ASSETS = '/vendor/diagrams/asymptote-0.3.3-st1'
export const TIKZ_OPTIONS = {
  showConsole: true,
  texPackages: { amsmath: '', amssymb: '' },
  tikzLibraries: 'arrows.meta,calc,positioning,decorations.pathmorphing,cd',
}
export interface BrowserDiagramResult { svg: string; sourceHash: string; warnings: string[] }
