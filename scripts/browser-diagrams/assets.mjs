import { cp, mkdir, copyFile, readFile, writeFile, readdir, rename, rm } from 'node:fs/promises'
import { prepareAsymptoteLabels } from './asymptote-labels.mjs'

// Keep runtime files together, on our own origin, at immutable versioned URLs.
await rm('public/vendor/diagrams', { recursive: true, force: true })
for (const [packageName, directory] of [
  ['@rod2ik/tikzjax', 'tikzjax-1.6.0-st1'], ['asymptote-web', 'asymptote-0.3.3-st1'],
]) {
  const target = `public/vendor/diagrams/${directory}`
  await mkdir(target, { recursive: true })
  await cp(`node_modules/${packageName}/dist`, target, { recursive: true })
  await copyFile(`node_modules/${packageName}/README.md`, `${target}/README.md`)
  await copyFile(`node_modules/${packageName}/package.json`, `${target}/package.json`)
  if (packageName === '@rod2ik/tikzjax') await copyFile(`node_modules/${packageName}/LICENSE`, `${target}/LICENSE`)
}

// Vite/static hosts may attach Content-Encoding to *.gz and transparently unzip
// it before TikZJax's own decompressor. Keep gzip bytes but use a neutral suffix.
const tikz = 'public/vendor/diagrams/tikzjax-1.6.0-st1'
for (const entry of await readdir(tikz + '/tex_files', { recursive: true })) {
  if (entry.endsWith('.gz')) await rename(`${tikz}/tex_files/${entry}`, `${tikz}/tex_files/${entry.slice(0, -3)}.bin`)
}
for (const file of ['tex.wasm', 'core.dump']) await rename(`${tikz}/${file}.gz`, `${tikz}/${file}.bin`)
const workerFile = `${tikz}/run-tex.js`
let worker = await readFile(workerFile, 'utf8')
for (const [pattern, replacement] of [
  ['tex.wasm.gz', 'tex.wasm.bin'], ['core.dump.gz', 'core.dump.bin'],
]) {
  if (!worker.includes(pattern)) throw new Error('TikZJax runtime layout changed: ' + pattern)
  worker = worker.replaceAll(pattern, replacement)
}
if (!/tex_files\/\$\{\w+\}\.gz/.test(worker)) throw new Error('TikZJax package loader changed')
worker = worker.replace(/(tex_files\/\$\{\w+\})\.gz/g, '$1.bin')
await writeFile(workerFile, worker)
await prepareAsymptoteLabels('public/vendor/diagrams/asymptote-0.3.3-st1')
