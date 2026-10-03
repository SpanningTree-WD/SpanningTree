import assert from 'node:assert/strict'
import { compileDiagram, sourceHash } from './compile'
const results = []
for (const [language, source] of [
  ['tikz', '\\begin{tikzpicture}\\draw (0,0) circle (1);\\node at (0,0) {$x^2$};\\end{tikzpicture}'],
  ['asymptote', 'size(160); draw(unitcircle); label("$x^2$",(0,0));'],
]) {
  const result = await compileDiagram(language, source)
  assert.equal(result.subarray(1, 4).toString(), 'PNG')
  results.push({ language, bytes: result.length })
}
await assert.rejects(compileDiagram('tikz', '\\undefinedcommand'), /컴파일 실패/)
await assert.rejects(compileDiagram('tikz', '\\input{/etc/passwd}'), /컴파일 실패/)
await assert.rejects(compileDiagram('asymptote', 'system("id");'), /컴파일 실패/)
await assert.rejects(compileDiagram('asymptote', 'while(true) {}'), /컴파일 실패/)
assert.equal(sourceHash('tikz', 'a\r\nb '), sourceHash('tikz', 'a\nb'))
console.log(JSON.stringify({ validCompilations: results, invalidSource: 'blocked', fileRead: 'blocked', systemCall: 'blocked', timeout: 'bounded', sourceCacheKey: 'stable' }))
