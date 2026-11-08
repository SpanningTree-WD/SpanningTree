import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { defaultHomepage } from '../../models/homepage'
import { HomeHero } from './HomeHero'

afterEach(cleanup)

describe('centered homepage hero', () => {
  it('uses the approved SVG and preserves the description and About link', () => {
    const { container } = render(<HomeHero settings={defaultHomepage} language="ko" />)
    expect(screen.getByRole('img', { name: 'Spanning Tree' })).toHaveAttribute('src', '/spanning-tree-hero-logo.svg')
    expect(screen.getByRole('heading', { name: 'Spanning Tree' })).toHaveClass('visually-hidden')
    expect(screen.getByText(/활동 기록과 수학 자료를 제공합니다/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /동아리 소개/ })).toHaveAttribute('href', '/about')
    expect(container.querySelector('.tree-art')).toBeNull()
    expect(container.querySelector('.homepage-hero .hero-grid .homepage-intro')).toBeInTheDocument()
  })

  it('continues to show editable custom titles in administrator previews', () => {
    const settings = {
      ...defaultHomepage,
      hero: { ...defaultHomepage.hero, title: { ...defaultHomepage.hero.title, ko: '특별한 수학 이야기' } },
    }
    const { container } = render(<HomeHero settings={settings} language="ko" preview />)
    expect(screen.getByRole('heading', { name: '특별한 수학 이야기' })).toBeInTheDocument()
    expect(container.querySelector('.homepage-hero-logo')).toBeNull()
    expect(screen.queryByRole('link', { name: /동아리 소개/ })).toBeNull()
    expect(screen.getByText(/동아리 소개/)).toBeInTheDocument()
  })
})
