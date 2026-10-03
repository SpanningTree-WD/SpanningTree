import { useT } from '../../i18n/LanguageProvider'
import type { Attachment } from '../../models/common'
import { isUploadUrl } from '../../services/uploads/uploadTypes'

export interface PendingAttachment {
  id: string
  fileName: string
  sizeLabel: string
  stateText: string
}

export function AttachmentList({
  files,
  pendingFiles = [],
}: {
  files: Attachment[]
  pendingFiles?: PendingAttachment[]
}) {
  const t = useT()

  const available = files.filter((file) => isUploadUrl(file.url))
  if (!available.length && !pendingFiles.length) return null
  return (
    <section className="attachments">
      <h2>{t("첨부 파일")}</h2>
      {available.map((file) => (
        <div className="attachment" key={file.url}>
          <span>
            {file.label}
            <small>
              {file.fileName} · {file.sizeLabel}
            </small>
          </span>
          <a
            className="pdf-btn"
            href={file.url}
            download={file.fileName}
            target="_blank"
            rel="noopener noreferrer"
          >{t("PDF 다운로드")}</a>
        </div>
      ))}
      {pendingFiles.map((file) => (
        <div className="attachment attachment-pending" key={file.id}>
          <span>
            {file.fileName}
            <small>{file.sizeLabel}</small>
          </span>
          <span role="status">{t(file.stateText)}</span>
        </div>
      ))}
    </section>
  )
}
