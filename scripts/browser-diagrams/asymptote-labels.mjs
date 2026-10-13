import { readFile, writeFile } from 'node:fs/promises'

/** Preserve evaluated label text alongside native geometry for local MathJax.
 * This changes the bundled .asy standard library, not the WASM executable.
 * Fail closed if the pinned upstream layout changes. */
export async function prepareAsymptoteLabels(directory) {
  let glue = await readFile(directory + '/asymptote.js', 'utf8')
  const data = await readFile(directory + '/asy.data')
  const pattern = /("filename": "\/usr\/local\/share\/asymptote\/plain_Label\.asy",\s*"start": )(\d+)(,\s*"end": )(\d+)/
  const match = pattern.exec(glue)
  if (!match) throw new Error('Asymptote standard-library layout changed')
  const source = data.subarray(Number(match[2]), Number(match[4])).toString('utf8')
  const anchor = 'else\n      fill(f,align(texpath(s,p0),S,align,p0),p0);'
  if (!source.includes(anchor)) throw new Error('Asymptote label implementation changed')
  const replacement = String.raw`else {
      string encoded="";
      for(int i=0; i<length(s); ++i) encoded += string(ascii(substr(s,i,1)))+" ";
      postscript(f,"<< /utf8 ["+encoded+"] /size "+string(fontsize(p0))+" >> asy_label_begin");
      fill(f,align(texpath(s,p0),S,align,p0),p0);
      postscript(f,"asy_label_end");
    }`
  const modified = Buffer.from(source.replace(anchor, replacement))
  glue = glue.replace(pattern, `$1${data.length}$3${data.length + modified.length}`)
    .replace(/("remote_package_size": )\d+/, `$1${data.length + modified.length}`)
  await writeFile(directory + '/plain_Label.asy', modified)
  await writeFile(directory + '/asy.data', Buffer.concat([data, modified]))
  await writeFile(directory + '/asymptote.js', glue)
}
