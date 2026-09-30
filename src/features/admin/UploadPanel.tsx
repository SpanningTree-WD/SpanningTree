import type { Attachment, MediaReference } from '../../models/common'
import { fileSizeLabel, isUploadUrl } from '../../services/uploads/uploadTypes'
import type { ArticleAttachments } from './useArticleAttachments'
import './UploadPanel.css'

export function UploadPanel({
  disabled, image, files, attachments, onImage, onRemovePdf, onRetry,
}: {
  disabled: boolean
  image: MediaReference
  files: Attachment[]
  attachments: ArticleAttachments
  onImage: (url: string | undefined) => void
  onRemovePdf: (url: string) => void
  onRetry: () => void
}) {
  const selectedImage = attachments.items.some((item) => item.file.type !== 'application/pdf')
  return (
    <section className="admin-upload-panel" aria-label="이 글의 첨부 파일">
      <h2>이 글의 사진·파일</h2>
      <p className="field-help">
        파일을 선택하면 미리보기에 반영됩니다. 저장을 누르면 이 글에 함께 저장됩니다.
        첨부 파일은 링크를 아는 누구나 열 수 있습니다.
      </p>
      <div className="admin-form-grid">
        <label className="admin-field">
          <span>대표 이미지 · 8MB 이하</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) attachments.stage(file)
              event.target.value = ''
            }} />
        </label>
        <label className="admin-field">
          <span>PDF · 20MB 이하</span>
          <input type="file" accept="application/pdf" disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) attachments.stage(file)
              event.target.value = ''
            }} />
        </label>
      </div>
      {attachments.error && <p role="alert" className="field-error">{attachments.error}</p>}
      {attachments.items.map((item) => (
        <div className="article-attachment" key={item.id}>
          <div>
            <strong>{item.file.name}</strong> · {fileSizeLabel(item.file.size)}
            <p role="status">
              {item.state === 'selected' ? '이 글에 첨부 예정 · 저장 필요'
                : item.state === 'uploading' ? '파일 전송 중'
                  : item.state === 'processing' ? '파일 준비 중 · 완료되면 글에 자동 저장됩니다.'
                    : item.state === 'ready' ? '파일 준비 완료 · 글 저장 대기'
                      : '첨부 실패 · 파일을 다시 선택하지 않고 재시도할 수 있습니다.'}
            </p>
            {['uploading', 'processing'].includes(item.state) && (
              <>
                <progress aria-label={item.file.name + ' 업로드 진행률'} max={100}
                  value={item.state === 'uploading' ? item.percent ?? 0 : undefined} />
                <small>
                  {item.state === 'uploading' && item.percent !== undefined
                    ? item.percent + '% 전송됨'
                    : '처리에 몇 분 걸릴 수 있습니다. 이 화면을 열어 두세요.'}
                </small>
              </>
            )}
            {item.error && <p className="field-error" role="alert">{item.error}</p>}
          </div>
          <div className="article-attachment-actions">
            {item.state === 'failed' && (
              <button type="button" disabled={disabled} onClick={onRetry}>첨부 재시도 및 저장</button>
            )}
            <button type="button" disabled={disabled} onClick={() => attachments.remove(item.id)}>
              {item.file.name} 첨부 취소
            </button>
          </div>
        </div>
      ))}
      {isUploadUrl(image.url) && !selectedImage && (
        <div className="article-attachment">
          <a href={image.url} target="_blank" rel="noopener noreferrer">현재 대표 이미지 ↗</a>
          <span>이 글에 첨부됨</span>
          <button type="button" disabled={disabled} onClick={() => onImage(undefined)}>이미지 첨부 해제</button>
        </div>
      )}
      {files.filter((file) => isUploadUrl(file.url)).map((file) => (
        <div className="article-attachment" key={file.url}>
          <a href={file.url} target="_blank" rel="noopener noreferrer">{file.fileName} ↗</a>
          <span>이 글에 첨부됨</span>
          <button type="button" disabled={disabled} onClick={() => onRemovePdf(file.url!)}>PDF 첨부 해제</button>
        </div>
      ))}
      {!attachments.items.length && !image.url && !files.some((file) => file.url) &&
        <p className="field-help">이 글에 선택한 첨부 파일이 없습니다.</p>}
      <p className="field-help">첨부 해제도 저장 후 반영됩니다. 다른 글의 파일에는 영향을 주지 않습니다.</p>
    </section>
  )
}
