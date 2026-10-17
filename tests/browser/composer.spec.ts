import { test, expect, type Page } from '@playwright/test'

const tikz = String.raw`\begin{tikzpicture}\draw[->] (0,0)--(2,1);\end{tikzpicture}`
const asy = 'size(160); draw(unitcircle);'

test.use({ actionTimeout: 10000 })
async function replaceBody(page: Page, value: string) {
  // Paste through the editor's clipboard handler. Mobile WebKit advertises an
  // Apple platform even on a Linux runner, so match CodeMirror's Mod key.
  const body = page.getByRole('textbox', { name: '본문', exact: true })
  await body.focus()
  const modifier = await page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.platform + ' ' + navigator.userAgent) ? 'Meta' : 'Control')
  await body.press(modifier + '+a')
  await body.evaluate((element, text) => {
    const clipboard = new DataTransfer()
    clipboard.setData('text/plain', text)
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }))
  }, value)
  await expect(page.getByTestId('body-source')).toHaveText(value)
}

test.beforeEach(async ({ page }) => {
  await page.route('**/uploads/*.png', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64') }))
  await page.goto('/tests/browser/fixture.html?composer')
})

test('inline source renders automatically, edits recover, and saved body renders for readers', async ({ page }) => {
  const body = page.getByRole('textbox', { name: '본문', exact: true })
  await replaceBody(page, 'An article\n\n```tikz caption="Arrow" alt="An arrow"\n' + tikz + '\n```\n\n```asymptote\n' + asy + '\n```')
  const diagrams = page.locator('.editor-diagram-preview')
  await expect(diagrams).toHaveCount(2)
  for (const diagram of await diagrams.all()) {
    await diagram.scrollIntoViewIfNeeded()
    await expect(diagram.locator('svg')).toBeVisible({ timeout: 45000 })
  }
  await expect(body).toContainText('\\draw')
  await page.getByRole('button', { name: 'Save locally' }).click()
  const reader = page.getByTestId('reader')
  await reader.scrollIntoViewIfNeeded()
  await expect(reader.locator('svg')).toHaveCount(2, { timeout: 45000 })
  await expect(reader.locator('figcaption')).toHaveText('Arrow')
  await expect(reader.locator('svg').first()).toHaveAttribute('aria-label', 'An arrow')
  await replaceBody(page, '```asy\nthis is invalid;\n```\n\nThe rest is editable.')
  await diagrams.scrollIntoViewIfNeeded()
  await expect(diagrams.getByRole('alert')).toBeVisible({ timeout: 45000 })
  await replaceBody(page, '```asy\n' + asy + '\n```\n\nThe rest is editable.')
  await expect(diagrams.locator('svg')).toBeVisible({ timeout: 45000 })
  await page.screenshot({ path: test.info().outputPath('inline-diagrams.png'), fullPage: true })
})

test('edits the selected citation, adds a reference in place, and edits image properties', async ({ page }) => {
  const source = page.getByTestId('body-source')
  await page.getByRole('button', { name: '인용 수정 [1]', exact: true }).nth(1).click()
  let dialog = page.getByRole('dialog', { name: '인용 수정', exact: true })
  await expect(dialog.getByLabel('[1] Alpha')).toBeChecked()
  await dialog.getByLabel('[1] Alpha').uncheck()
  await dialog.getByLabel('[2] Beta').check()
  await dialog.getByRole('button', { name: '인용 변경', exact: true }).click()
  await expect(source).toContainText('First [@a]. Second [@b].')
  await page.getByRole('button', { name: '인용 수정 [2]', exact: true }).click()
  dialog = page.getByRole('dialog', { name: '인용 수정', exact: true })
  await dialog.getByText('새 참고문헌', { exact: true }).click()
  await dialog.getByLabel('제목', { exact: true }).fill('Jones paper')
  await dialog.getByRole('button', { name: '문헌 추가하고 인용' }).click()
  await expect(page.locator('.editor-citation').nth(1)).toHaveText('[2], [3]')
  await expect(page.locator('.references-editor')).toContainText('Jones paper')
  await page.getByRole('button', { name: '첨부 설정: Graph', exact: true }).click()
  dialog = page.getByRole('dialog', { name: '첨부 설정', exact: true })
  await dialog.getByLabel('캡션', { exact: true }).fill('Figure 1')
  await dialog.getByLabel('대체 텍스트').fill('A graph')
  await dialog.getByLabel('너비 (본문 대비 %)').fill('60')
  await dialog.getByLabel('정렬', { exact: true }).selectOption('right')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.markdown-editor .body-image')).toHaveClass(/align-right/)
  await expect(page.locator('.markdown-editor figcaption')).toHaveText('Figure 1')
  await page.getByRole('button', { name: 'Save locally' }).click()
  await expect(page.getByTestId('reader').getByAltText('A graph')).toBeVisible()
  await expect(page.getByTestId('reader').locator('figure')).toHaveAttribute('style', 'width:60%')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('composer.png'), fullPage: true })
})

test('template buttons insert editable fenced source and image selection inserts at the cursor', async ({ page }) => {
  const body = page.getByRole('textbox', { name: '본문', exact: true })
  await replaceBody(page, 'Opening\n\n')
  await body.press('ControlOrMeta+End')
  await page.getByLabel('사진 선택', { exact: true }).setInputFiles({ name: 'New.png', mimeType: 'image/png', buffer: Buffer.from('fixture') })
  await expect(page.getByTestId('body-source')).toContainText('Opening\n\n\n\n{{asset:upload-1-0}}')
  await page.getByRole('button', { name: 'TikZ 코드', exact: true }).click()
  await expect(page.getByTestId('body-source')).toContainText('```tikz')
  await expect(page.getByLabel('도형 소스', { exact: true })).toHaveCount(0)
  await page.locator('.editor-diagram-preview').scrollIntoViewIfNeeded()
  await expect(page.locator('.editor-diagram-preview svg')).toBeVisible({ timeout: 45000 })
})
