import { expect, it } from 'vitest'
import { validateAuthoring, type DiagramBlock } from './authoring'
it.each(['tikz', 'asymptote'] as const)('accepts reviewed %s source without an image', language => {
  const diagram: DiagramBlock = { id: 'test', language, source: 'source', renderer: 'browser-v1', sourceHash: 'a'.repeat(64) }
  expect(() => validateAuthoring({ content: '{{diagram:test}}', diagrams: [diagram] })).not.toThrow()
  expect(() => validateAuthoring({ content: '{{diagram:test}}', diagrams: [{ ...diagram, source: '' }] })).toThrow()
  expect(() => validateAuthoring({ content: '{{diagram:test}}', diagrams: [{ ...diagram, sourceHash: '' }] })).toThrow()
})
it('still accepts legacy images and rejects missing diagram references', () => {
  const diagram: DiagramBlock = { id: 'old', language: 'tikz', source: 'source', url: '/uploads/' + 'a'.repeat(64) + '.png' }
  expect(() => validateAuthoring({ content: '{{diagram:old}}', diagrams: [diagram] })).not.toThrow()
  expect(() => validateAuthoring({ content: '{{diagram:missing}}', diagrams: [diagram] })).toThrow()
})
it('requires the chosen reference format and preserves legacy mixed references', () => {
  const legacy = { id: 'book', title: 'Book title', text: 'Custom citation' }
  expect(() => validateAuthoring({ references: [legacy] })).not.toThrow()
  expect(() => validateAuthoring({ references: [{ ...legacy, format: 'free', text: '' }] })).toThrow()
  expect(() => validateAuthoring({ references: [{ ...legacy, format: 'structured', text: '' }] })).not.toThrow()
})
