import { test, expect } from '@playwright/test'
import type * as Service from '../../src/services/diagrams/browserDiagramService'
declare global { interface Window { diagramService: typeof Service } }
const tikz = String.raw`\begin{tikzpicture}\draw[->] (0,0)--(2,1);\node at (1,0) {$\frac{x^2}{2}$};\end{tikzpicture}`
const asy = 'size(240); import graph; draw(graph(new real(real x) { return x*x/2; },0,2)); label("$x^2$",(1,0));'

test('real render, cache, reviewed source-only save, and reader for both languages', async ({ page }, info) => {
  const outgoing: string[] = []
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4176')) outgoing.push(request.url()) })
  page.on('pageerror', error => console.log('pageerror', error.message))
  await page.goto('/tests/browser/fixture.html')
  for (const [language, source] of [['tikz', tikz], ['asymptote', asy]] as const) {
    if (language === 'asymptote') await page.getByRole('button', { name: 'Switch language' }).click()
    await page.getByLabel('도형 소스').fill(source)
    const started = Date.now()
    await page.getByRole('button', { name: '렌더링 확인' }).click()
    await expect(page.locator('.diagram-editor .browser-diagram-output svg')).toBeVisible({ timeout: 45000 })
    await expect(page.locator('.diagram-editor svg')).toHaveAttribute('viewBox', /\d/)
    expect(await page.locator('.diagram-editor svg path[d]').count()).toBeGreaterThan(0)
    if (language === 'asymptote') await expect(page.locator('.diagram-editor svg [data-mml-node="msup"]')).toBeVisible()
    console.log(info.project.name, language, 'cold-ms', Date.now() - started)
    await page.getByRole('button', { name: '본문에 삽입' }).click()
    await page.locator('.markdown-content .browser-diagram-output').scrollIntoViewIfNeeded()
    await expect(page.locator('.markdown-content .browser-diagram-output svg')).toBeVisible()
    expect(await page.locator('.markdown-content svg path[d]').count()).toBeGreaterThan(0)
    const record = JSON.parse(await page.getByTestId('saved').innerText())
    expect(record.source).toBe(source); expect(record.renderer).toBe('browser-v1'); expect(record.url).toBeUndefined(); expect(record.svg).toBeUndefined()
    const warm = await page.evaluate(async ({ language, source }) => {
      const start = performance.now(); await window.diagramService.renderBrowserDiagram(language, source); return performance.now() - start
    }, { language, source })
    console.log(info.project.name, language, 'cached-ms', warm)
    await page.screenshot({ path: test.info().outputPath(language + '.png'), fullPage: true })
  }
  expect(outgoing).toEqual([])
})

test('kills timed-out workers and renders again for both languages', async ({ page }) => {
  await page.goto('/tests/browser/fixture.html')
  for (const language of ['tikz', 'asymptote'] as const) {
    const source = language === 'tikz' ? tikz : asy
    // Warm the engine, then interrupt actual non-terminating user code.
    const outcome = await page.evaluate(async ({ language, source }) => {
      const service = window.diagramService
      await service.renderBrowserDiagram(language, source)
      let failure = ''
      try {
        await service.renderBrowserDiagram(language, language === 'tikz' ? String.raw`\def\forever{\forever}\forever` : 'while(true) {}', { timeoutMs: 1000 })
      } catch (error) { failure = (error as Error).message }
      const result = await service.renderBrowserDiagram(language, source + '\n' + (language === 'tikz' ? '% after timeout' : '// after timeout'))
      return { failure, svg: result.svg }
    }, { language, source })
    expect(outcome.failure).toContain('시간이 초과')
    expect(outcome.svg).toContain('<svg')
  }
})

test('invalid source stays editable and retry recovers in the editor', async ({ page }) => {
  await page.goto('/tests/browser/fixture.html')
  await page.getByRole('button', { name: 'Switch language' }).click()
  await page.getByLabel('도형 소스').fill('this is invalid;')
  await page.getByRole('button', { name: '렌더링 확인' }).click()
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 45000 })
  await expect(page.getByRole('button', { name: '본문에 삽입' })).toBeDisabled()
  await page.getByLabel('도형 소스').fill(asy)
  await page.getByRole('button', { name: '렌더링 확인' }).click()
  await expect(page.locator('.diagram-editor svg')).toBeVisible({ timeout: 45000 })
})

test('TikZ libraries, Asymptote fractions, persistent cache and error isolation', async ({ page }) => {
  await page.goto('/tests/browser/fixture.html')
  const samples = [
    { language: 'tikz' as const, source: String.raw`\begin{tikzcd} A \arrow[r,"f"] \arrow[d,"g"'] & B \arrow[d,"h"] \\ C \arrow[r,"k"'] & D \end{tikzcd}` },
    { language: 'asymptote' as const, source: String.raw`size(160); draw(unitcircle); label("$\frac{1}{\sqrt{2}}$",(0,0)); label("A",(1,0),E);` },
  ]
  for (const sample of samples) {
    const result = await page.evaluate(async sample => window.diagramService.renderBrowserDiagram(sample.language, sample.source), sample)
    expect(result.svg).toContain('path')
    if (sample.language === 'asymptote') { expect(result.svg).toContain('data-mml-node="mfrac"'); expect(result.svg).toContain('data-mml-node="msqrt"') }
  }
  const invalid = await page.evaluate(async () => {
    try { await window.diagramService.renderBrowserDiagram('tikz', String.raw`\begin{tikzpicture}\undefinedcommand\draw (0,0)--(1,1);\end{tikzpicture}`); return '' }
    catch (error) { return (error as Error).message }
  })
  expect(invalid).not.toBe('')
  // A new document must render cached SVG even when compiler assets are unavailable.
  await page.reload(); await page.waitForFunction(() => !!window.diagramService)
  await page.route('**/vendor/diagrams/**', route => route.abort())
  for (const sample of samples) {
    const result = await page.evaluate(async sample => window.diagramService.renderBrowserDiagram(sample.language, sample.source), sample)
    expect(result.svg).toContain('<svg')
  }
})
