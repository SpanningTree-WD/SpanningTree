import { webcrypto } from 'node:crypto'
import { beforeAll, expect, it, vi } from 'vitest'
import { mathematicsFixtures } from '../../content/fixtures/mathematics'
import { mathematicsCovers, prepareMathematicsCover } from './mathematicsCovers'

beforeAll(() => vi.stubGlobal('crypto', webcrypto))
const photo = { id: 'photo', fileName: 'figure.png', mediaType: 'image/png' as const,
  url: '/uploads/' + 'a'.repeat(64) + '.png', size: 32 }
const source = [
  '{{asset:photo}}', '![](https://example.com/figure.png)', '$a+b$', '$$c+d$$',
  '`$example$`', '```tikz caption="Triangle"\n\\draw (0,0)--(1,1);\n```',
  '> ~~~asy\n> draw(unitcircle);\n> ~~~',
  '````markdown\n```tikz\nexample\n```\n````',
].join('\n\n')
const record = { ...mathematicsFixtures[0], content: source, assets: [photo, { ...photo, id: 'unused' }] }

it('offers body insertions and rendered math/diagram fences, excluding code examples and unused uploads', async () => {
  const options = await mathematicsCovers(record)
  expect(options.map(option => option.kind)).toEqual(['image', 'image', 'inline', 'display', 'tikz', 'asymptote'])
  const diagram = options.find(option => option.label === 'Triangle')!
  const selected = { ...record, coverImage: { alt: '', variant: diagram.key } }
  const reordered = { ...selected, content: '$x$\n\n' + source }
  expect((await prepareMathematicsCover(reordered)).coverImage).toEqual(selected.coverImage)
  expect((await prepareMathematicsCover({ ...selected, content: '$x$' })).coverImage.variant).toBe('blue')
})

it('keeps legacy covers, does not assign unused body pictures and offers only valid image URLs', async () => {
  expect(await prepareMathematicsCover(record)).toBe(record)
  const options = await mathematicsCovers({ ...record, content: '![bad](javascript:alert(1))' })
  expect(options).toEqual([])
})
