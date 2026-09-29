import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { MathematicsEditorPage } from './MathematicsEditorPage'
import { PublicationEditorPage } from './PublicationEditorPage'

const repository = vi.hoisted(() => ({ create: vi.fn(), getById: vi.fn(), update: vi.fn() }))
vi.mock('../../repositories/adminRepositories', () => ({
  mathematicsRepository: repository,
  publicationRepository: repository,
}))
beforeEach(() => {
  vi.clearAllMocks()
  repository.create.mockImplementation(async (input) => ({ ...input, id: 'saved' }))
  repository.getById.mockImplementation(async () => repository.create.mock.results[0].value)
})
afterEach(cleanup)

it.each([
  {
    path: 'mathematics',
    page: <MathematicsEditorPage />,
    author: '작성자',
    body: '본문',
    type: '자료 유형',
    value: 'Lecture Note',
  },
  {
    path: 'publications',
    page: <PublicationEditorPage />,
    author: '저자',
    body: '출판물 소개',
    type: '출판물 유형',
    value: 'Book',
  },
])(
  'saves $path using only the simplified fields and supports typing multiple authors',
  async ({ path, page, author, body, type, value }) => {
    render(
      <RouterProvider
        router={createMemoryRouter(
          [
            { path: `/admin/${path}/new`, element: page },
            { path: `/admin/${path}/:id/edit`, element: page },
          ],
          { initialEntries: [`/admin/${path}/new`] }
        )}
      />
    )
    await screen.findByLabelText(/제목/)
    fireEvent.change(screen.getByLabelText(/제목/), { target: { value: '수학의 시작' } })
    const names = screen.getByLabelText(new RegExp(author))
    for (const text of ['김하나', '김하나,', '김하나, ', '김하나, 이둘']) {
      fireEvent.change(names, { target: { value: text } })
      expect(names).toHaveValue(text)
    }
    fireEvent.change(screen.getByLabelText(new RegExp(type)), { target: { value } })
    if (path === 'mathematics')
      fireEvent.change(screen.getByLabelText(/수학 분야/), { target: { value: 'Algebra' } })
    fireEvent.change(screen.getByLabelText(body), {
      target: { value: '기초부터 함께 공부합니다.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '임시 저장' }))
    await waitFor(() => expect(repository.create).toHaveBeenCalledOnce())
    expect(repository.create.mock.calls[0][0]).toMatchObject({
      title: '수학의 시작',
      authors: ['김하나', '이둘'],
      type: value,
      slug: expect.stringMatching(new RegExp(`^${path}-[a-z0-9-]+$`)),
      summary: '기초부터 함께 공부합니다.',
    })
  }
)
