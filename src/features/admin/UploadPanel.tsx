import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Attachment, MediaReference } from '../../models/common'
import {
  cancelUpload,
  queueGitHubUpload,
  watchUpload,
} from '../../services/uploads/GitHubUploadService'
import {
  fileSizeLabel,
  isUploadActive,
  isUploadUrl,
  type UploadCollection,
  type UploadRequest,
} from '../../services/uploads/uploadTypes'
import { adminErrorMessage } from './adminErrors'

const stateLabels = {
  uploading: '파일 전송 중',
  queued: 'GitHub 저장 대기 중',
  processing: '파일 확인 및 GitHub 저장 중',
  committed: '사이트 배포 대기 중',
  complete: '배포 완료 · 글에 첨부할 수 있습니다',
  cancelled: '취소 처리 중',
  failed: '업로드를 완료하지 못했습니다',
}
export function UploadPanel({
  collection,
  recordId,
  disabled,
  image,
  files,
  onImage,
  onPdf,
  onRemovePdf,
}: {
  collection: UploadCollection
  recordId: string
  disabled: boolean
  image: MediaReference
  files: Attachment[]
  onImage: (url: string | undefined) => void
  onPdf: (file: Attachment) => void
  onRemovePdf: (url: string) => void
}) {
  const [request, setRequest] = useState<UploadRequest | null>(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  useEffect(() => {
    try {
      return watchUpload(setRequest, (failure) => setError(adminErrorMessage(failure)))
    } catch (failure) {
      setError(adminErrorMessage(failure))
    }
  }, [])
  const active = request && isUploadActive(request.state)
  const own = request?.collection === collection && request.recordId === recordId
  const attached =
    request?.url && (image.url === request.url || files.some((file) => file.url === request.url))
  async function upload(file?: File) {
    if (!file) return
    setError('')
    setProgress(0)
    try {
      await queueGitHubUpload(file, collection, recordId, setProgress)
    } catch (failure) {
      setError(adminErrorMessage(failure))
    } finally {
      setProgress(null)
    }
  }
  function attach() {
    if (!request?.url || !isUploadUrl(request.url)) return
    if (request.mediaType === 'application/pdf')
      onPdf({
        label: request.fileName,
        fileName: request.fileName,
        mediaType: 'application/pdf',
        sizeLabel: fileSizeLabel(request.size),
        url: request.url,
      })
    else onImage(request.url)
  }
  return (
    <details className="admin-upload-panel">
      <summary>이미지·PDF 첨부 (선택)</summary>
      <p>파일은 GitHub에 공개 저장됩니다. 글을 비공개로 해도 파일은 공개됩니다.</p>
      {!recordId ? (
        <p>글을 먼저 임시 저장하면 파일을 올릴 수 있습니다.</p>
      ) : (
        <>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>대표 이미지 · 8MB 이하</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={disabled || Boolean(active) || progress !== null}
                onChange={(event) => {
                  void upload(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </label>
            <label className="admin-field">
              <span>PDF · 20MB 이하</span>
              <input
                type="file"
                accept="application/pdf"
                disabled={disabled || Boolean(active) || progress !== null}
                onChange={(event) => {
                  void upload(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </label>
          </div>
          <p className="field-help">
            한 번에 한 파일씩 처리합니다. 서버는 5분 간격으로 확인하며 GitHub 사정에 따라 더 늦어질
            수 있습니다.
          </p>
        </>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {request && (
        <div className="upload-status" role="status">
          <strong>{request.fileName}</strong> · {stateLabels[request.state]}
          {progress !== null && (
            <progress aria-label="파일 전송 진행률" value={progress} max={100} />
          )}
          {request.error && <p>{request.error}</p>}
          {!own && (
            <p>
              다른 글에 올린 파일입니다.{' '}
              <Link to={`/admin/${request.collection}/${request.recordId}/edit`}>
                해당 글로 이동
              </Link>
            </p>
          )}
          {own && request.state === 'complete' && !attached && (
            <button type="button" disabled={disabled} onClick={attach}>
              글에 첨부
            </button>
          )}
          {own && attached && <p>첨부된 파일입니다. 변경한 내용은 아래 저장 버튼으로 반영해 주세요.</p>}
          {['uploading', 'queued'].includes(request.state) && progress === null && (
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                void cancelUpload().catch((failure) => setError(adminErrorMessage(failure)))
              }
            >
              대기 취소
            </button>
          )}
        </div>
      )}
      {isUploadUrl(image.url) && (
        <p className="selected-upload">
          <a href={image.url} target="_blank" rel="noopener noreferrer">
            선택한 이미지 보기 ↗
          </a>
          <button type="button" disabled={disabled} onClick={() => onImage(undefined)}>
            이미지 첨부 해제
          </button>
        </p>
      )}
      {files
        .filter((file) => isUploadUrl(file.url))
        .map((file) => (
          <p className="selected-upload" key={file.url}>
            <a href={file.url} target="_blank" rel="noopener noreferrer">
              {file.fileName} ↗
            </a>
            <button type="button" disabled={disabled} onClick={() => onRemovePdf(file.url!)}>
              PDF 첨부 해제
            </button>
          </p>
        ))}
      {(image.url || files.some((file) => file.url)) && (
        <p className="field-help upload-help">
          첨부를 해제해도 GitHub에 저장된 파일은 삭제되지 않습니다.
        </p>
      )}
      <p className="field-help upload-help">
        오래 대기하면 운영자가{' '}
        <a
          href="https://github.com/SpanningTree-WD/SpanningTree/actions/workflows/github-uploads.yml"
          target="_blank"
          rel="noopener noreferrer"
        >
          업로드 작업
        </a>
        의 실행 상태를 확인할 수 있습니다. 배포가 끝난 뒤 ‘글에 첨부’를 누르고 저장해 주세요.
      </p>
    </details>
  )
}
