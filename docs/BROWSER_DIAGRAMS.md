# Browser diagram runtimes

The site self-hosts the exact npm packages below. Generated runtime files are
excluded from Git and reproduced by `npm ci && npm run diagrams:assets`.
The lockfile pins integrity hashes. There is no runtime CDN or rendering API.

| Runtime | License declared upstream | Source |
| --- | --- | --- |
| `@rod2ik/tikzjax@1.6.0` | GPL-3.0+ | https://github.com/rod2ik/tikzjax |
| `asymptote-web@0.3.3` | LGPL-3.0 | https://github.com/Julieisbaka/Asymptote-web/tree/fe79f09eb070f2c6061118173742f961dfda0da5 |
| Asymptote 3.15 (inside the WASM package) | LGPL-3.0 | https://github.com/vectorgraphics/asymptote |

Package README, metadata and supplied license notices accompany the hosted
runtime. TikZ fonts/TeX packages retain their upstream notices. Local runtime
adaptations are fully provided in `scripts/browser-diagrams/`: neutral suffixes
for gzip payloads, and a small source patch adding evaluated Asymptote label
metadata. The patched `plain_Label.asy` is also served beside the runtime.
No modification is made to the Asymptote WASM executable.

## Maintenance

Change the versioned asset URL when changing runtime packages or adaptations,
and change the rendering cache fingerprint when output semantics change. Keep
all engine files from a matching release together. Test a clean browser profile,
warm engine, cached diagram, invalid code, infinite loop, new page with cached
output, and both public/editor views. The asset preparation script intentionally
fails if expected upstream code/metadata no longer matches.

TikZJax has a roughly 2.8 MB compressed TeX core plus worker/fonts; the expanded
core consumes about 164 MB in a worker. Asymptote's uncompressed WASM file is
roughly 33 MB plus its standard library. Only the requested language is loaded.
First-load time therefore depends on the connection and device; local automated
timings exclude real Internet latency. One worker per language limits concurrent
engine memory. SVG caches are bounded; blocked/private IndexedDB is optional.

The site currently supports 2D diagrams. Asymptote label geometry uses the
browser port's approximate native measurements, then MathJax supplies the text
and math glyphs. This is not pixel-identical to native pdfLaTeX, especially for
long formulas or custom TeX fonts. Existing uploaded PNG diagrams remain intact.

Run `npm test`, `npm run lint`, `npm run build`, `npm run test:rules`, and
`npm run test:browser-diagrams`. Browser tests build a production-mode fixture
in `.diagram-test`; it is never included in the normal `dist` deployment.
