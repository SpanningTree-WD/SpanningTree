import type { Tokens } from 'marked'
import type { DiagramBlock } from './authoring'

/** Diagram source stays in the Markdown body; no generated IDs or SVG are saved. */
export function diagramFromFence(token: Tokens.Code, id: string): DiagramBlock | undefined {
  // Marked unescapes token.lang; use the original info string for JSON metadata.
  const opening = /^ {0,3}(`{3,}|~{3,})([^\n]*)\n/.exec(token.raw)
  const info = /^(tikz|asymptote|asy)(?:\s+(.*))?$/i.exec(opening?.[2].trim() ?? '')
  if (!info || !opening) return
  const fence = opening[1]
  // Incomplete fences remain editable code, including while the user is typing.
  const closing = new RegExp('(?:^|\\n) {0,3}' + fence[0] + '{' + fence.length + ',}[ \\t]*(?:\\n)?$')
  if (!closing.test(token.raw.slice(opening[0].length))) return
  const metadata: { caption?: string; alt?: string } = {}
  let rest = (info[2] ?? '').trim()
  while (rest) {
    const match = /^(caption|alt)=("(?:[^"\\]|\\.)*")(?:\s+|$)/.exec(rest)
    if (!match) return // Unknown info strings remain ordinary code.
    try { metadata[match[1] as 'caption' | 'alt'] = JSON.parse(match[2]) }
    catch { return }
    rest = rest.slice(match[0].length).trim()
  }
  return { id, language: info[1].toLowerCase() === 'tikz' ? 'tikz' : 'asymptote', source: token.text, renderer: 'browser-v1', ...metadata }
}

export function diagramFence(diagram: Pick<DiagramBlock, 'language' | 'source' | 'caption' | 'alt'>) {
  const info = [diagram.language, ...(['caption', 'alt'] as const).flatMap(key => diagram[key] ? [key + '=' + JSON.stringify(diagram[key])] : [])].join(' ')
  const mark = info.includes('`') ? '~' : '`'
  const longest = Math.max(2, ...[...diagram.source.matchAll(new RegExp(mark + '+', 'g'))].map(match => match[0].length))
  const fence = mark.repeat(longest + 1)
  return fence + info + '\n' + diagram.source.replace(/\n?$/, '\n') + fence
}

export const diagramExamples = {
  tikz: String.raw`\begin{tikzpicture}
\draw[->] (0,0) -- (3,0);
\draw[->] (0,0) -- (0,2);
\draw[domain=0:2] plot (\x,{\x*\x/2});
\end{tikzpicture}`,
  asymptote: 'size(240);\nimport graph;\ndraw((0,0)--(3,0),Arrow);\ndraw((0,0)--(0,2),Arrow);\ndraw(graph(new real(real x) { return x*x/2; },0,2));',
}
