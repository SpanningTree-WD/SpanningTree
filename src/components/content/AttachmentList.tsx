import type { Attachment } from '../../models/common'
import { isUploadUrl } from '../../services/uploads/uploadTypes'

export function AttachmentList({ files }: { files: Attachment[] }) {
  const available = files.filter((file) => isUploadUrl(file.url))
  if (!available.length) return null
  return (
    <section className="attachments">
      <h2>첨부 파일</h2>
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
          >
            PDF 다운로드
          </a>
        </div>
      ))}
    </section>
  )
}
