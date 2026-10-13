import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DiagramEditor } from '../../src/features/admin/DiagramEditor'
import { MarkdownRenderer } from '../../src/components/content/MarkdownRenderer'
import type { DiagramBlock } from '../../src/models/authoring'
import { validateAuthoring } from '../../src/models/authoring'
import * as diagramService from '../../src/services/diagrams/browserDiagramService'
import '../../src/styles/tokens.css'
import '../../src/styles/global.css'
import '../../src/features/admin/ArticleComposer.css'

Object.assign(window, { diagramService })
function Fixture() {
  const [language, setLanguage] = useState<DiagramBlock['language']>('tikz')
  const [saved, setSaved] = useState<DiagramBlock>()
  return <main style={{ maxWidth: 780, padding: 20, margin: 'auto' }}>
    <button onClick={() => setLanguage(language === 'tikz' ? 'asymptote' : 'tikz')}>Switch language</button>
    <DiagramEditor key={language} language={language} scope={{ collection: 'mathematics', recordId: 'local-fixture' }} onClose={() => {}} onSave={value => {
      validateAuthoring({ content: '{{diagram:' + value.id + '}}', diagrams: [value] }); setSaved(value)
    }} />
    {saved && <><h2>Reader</h2><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} data-testid="saved">{JSON.stringify(saved)}</pre><MarkdownRenderer content={'{{diagram:' + saved.id + '}}'} diagrams={[saved]} /></>}
  </main>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
