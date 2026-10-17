import { useState } from 'react'
import { ArticleComposer } from '../../src/features/admin/ArticleComposer'
import { MarkdownRenderer, ReferenceList } from '../../src/components/content/MarkdownRenderer'
import { type ArticleAsset, type DiagramBlock, type ReferenceEntry, validateAuthoring } from '../../src/models/authoring'
import type { BodyUploads } from '../../src/features/admin/useBodyUploads'
import { SummaryField } from '../../src/features/admin/SummaryField'
import { AuthorSelector } from '../../src/features/admin/AuthorPicker'
import { prepareEditorRecord } from '../../src/features/admin/editorMetadata'

export function ComposerFixture() {
  const [body, setBody] = useState('First [@a]. Second [@a].\n\n{{asset:photo}}')
  const [assets, setAssets] = useState<ArticleAsset[]>([{ id: 'photo', fileName: 'Graph.png', url: '/uploads/' + 'a'.repeat(64) + '.png', mediaType: 'image/png', size: 100, alt: 'Graph' }])
  const [refs, setRefs] = useState<ReferenceEntry[]>([{ id: 'a', title: 'Alpha' }, { id: 'b', title: 'Beta' }])
  const [diagrams, setDiagrams] = useState<DiagramBlock[]>([])
  const [saved, setSaved] = useState('')
  const [summary, setSummary] = useState('')
  const [authors, setAuthors] = useState(['Kim', 'Guest'])
  const [authorIds, setAuthorIds] = useState(['member-kim'])
  const [metadata, setMetadata] = useState('')
  const uploads: BodyUploads = {
    items: [], error: '', hasPending: false, views: values => values ?? [], remove: () => {}, retry: () => {}, clear: () => {},
    enqueue: files => {
      const added = files.map((file, index) => ({ id: 'upload-' + assets.length + '-' + index, fileName: file.name, url: '/uploads/' + 'a'.repeat(64) + '.png', mediaType: 'image/png' as const, size: file.size, alt: file.name }))
      setAssets([...assets, ...added]); return added.map(asset => asset.id)
    },
  }
  return <main className="admin-main" style={{ maxWidth: 780, padding: 20, margin: 'auto' }}>
    <h1>Article editor test</h1>
    <p>Changes stay in this page and are not sent to the site.</p>
    <SummaryField value={summary} body={body} onChange={setSummary} />
    <AuthorSelector authors={authors} authorIds={authorIds} members={[{ id: 'member-kim', name: 'Kim', generation: 38, isLeader: false, createdAt: '', updatedAt: '' }]} onChange={(names, ids) => { setAuthors(names); setAuthorIds(ids) }} />
    <ArticleComposer value={body} assets={assets} references={refs} diagrams={diagrams} uploads={uploads} scope={{ collection: 'mathematics', recordId: 'fixture' }} onChange={setBody} onAssets={setAssets} onReferences={setRefs} onDiagrams={setDiagrams} onCover={() => {}} />
    <button onClick={() => {
      validateAuthoring({ content: body, assets, references: refs, diagrams }); setSaved(body)
      const record = { title: 'Test', summary, content: body, authors, authorIds, coverImage: { alt: '', variant: '' } }
      setMetadata(JSON.stringify(prepareEditorRecord(record, record)))
    }}>Save locally</button>
    <pre data-testid="saved-metadata" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{metadata}</pre>
    <pre data-testid="body-source" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{body}</pre>
    <div data-testid="reader"><MarkdownRenderer content={saved} assets={assets} references={refs} diagrams={diagrams} /><ReferenceList references={refs} /></div>
  </main>
}
