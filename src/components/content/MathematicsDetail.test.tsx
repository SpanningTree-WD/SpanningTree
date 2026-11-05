import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { mathematicsFixtures } from '../../content/fixtures/mathematics'
import { contentExcerpt } from '../../models/contentExcerpt'
import { MathematicsDetail } from './ContentDetail'

afterEach(cleanup)

it('omits a duplicate automatic excerpt without changing the saved record or formulas', () => {
  const content = '우리는 \\(F(x,y)=0\\)에서 시작한다. '.repeat(10) + '\n\n$$2g_X-2 = d(2g_Y-2) + R$$'
  const record = { ...mathematicsFixtures[0], content, summary: contentExcerpt(content) }
  const before = JSON.stringify(record)
  const { container } = render(<MathematicsDetail record={record} />)
  expect(container.querySelector('.detail-summary')).toBeNull()
  expect(container.querySelectorAll('.reading-body .mathjax-inline')).toHaveLength(10)
  expect(container.querySelector('.mathjax-display')).toHaveAttribute('aria-label', '2g_X-2 = d(2g_Y-2) + R')
  expect(JSON.stringify(record)).toBe(before)
})

it('renders a separately written summary with its inline math and emphasis', () => {
  const record = { ...mathematicsFixtures[0], summary: '**Genus** \\(g\\)를 계산하는 방법을 소개합니다.' }
  const { container } = render(<MathematicsDetail record={record} />)
  const summary = container.querySelector('.detail-summary')!
  expect(summary.querySelector('strong')).toHaveTextContent('Genus')
  expect(summary.querySelector('.mathjax-inline')).toHaveAttribute('aria-label', 'g')
  expect(summary.textContent).not.toMatch(/\\\(|\*\*/)
})

it('recognizes older excerpts with different whitespace that end inside display math', () => {
  const content = '우리는 \\(F(x,y)=0\\)을 본다.\n\n여기서 **실수**를 생각한다.\n\n$$x^2+y^2=1$$'
  const summary = '우리는 \\(F(x,y)=0\\)을 본다. 여기서 실수를 생각한다. $…'
  const { container } = render(<MathematicsDetail record={{ ...mathematicsFixtures[0], content, summary }} />)
  expect(container.querySelector('.detail-summary')).toBeNull()
  expect(container.querySelector('.mathjax-display')).toHaveAttribute('aria-label', 'x^2+y^2=1')
})
