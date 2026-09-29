import { useEffect, useState } from 'react'
import {
  fileSizeLabel,
  isUploadActive,
  type UploadConnection,
  type UploadRequest,
  type UploadState,
} from '../../services/uploads/uploadTypes'

export interface PendingUpload {
  fileName: string
  size: number
  startedAtMs: number
  previousUploadId?: string
}

const steps = ['파일 전송', '처리 대기', '파일 저장', '사이트 반영', '완료']
const stages: Record<UploadState, { index: number; title: string; detail: string }> = {
  uploading: {
    index: 0,
    title: '파일 전송 중',
    detail: '파일을 확인하고 서버로 보내고 있습니다. 전송이 끝날 때까지 이 창을 열어 두세요.',
  },
  queued: {
    index: 1,
    title: '처리 순서 대기 중',
    detail: '파일 전송을 마쳤습니다. 서버가 작업을 시작하기를 기다리고 있습니다.',
  },
  processing: {
    index: 2,
    title: '파일 확인·저장 중',
    detail: '서버가 파일을 검사하고 저장하고 있습니다.',
  },
  committed: {
    index: 3,
    title: '사이트 반영 중',
    detail: '파일을 저장했습니다. 배포 순서를 기다리거나 사이트에 반영하고 있습니다.',
  },
  complete: {
    index: 4,
    title: '사이트 반영 완료',
    detail: '파일을 사용할 수 있습니다. 글에 첨부한 뒤 저장해 주세요.',
  },
  cancelled: {
    index: -1,
    title: '취소 처리 중',
    detail: '취소 요청을 보냈습니다. 서버의 임시 파일 정리가 끝날 때까지 기다려 주세요.',
  },
  failed: {
    index: -1,
    title: '업로드를 완료하지 못했습니다',
    detail: '아래 오류 내용을 확인한 뒤 다시 업로드해 주세요.',
  },
}

function duration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  return seconds < 60 ? `${seconds}초` : `${Math.floor(seconds / 60)}분 ${seconds % 60}초`
}

export function UploadProgress({
  request,
  pending,
  percent,
  connection,
  immediate,
}: {
  request: UploadRequest | null
  pending: PendingUpload | null
  percent: number | null
  connection: UploadConnection
  immediate: boolean
}) {
  const [now, setNow] = useState(Date.now)
  const [online, setOnline] = useState(() => navigator.onLine)
  const state = request?.state ?? 'uploading'
  const active = isUploadActive(state)
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active])
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const stage = stages[state]
  const startedAt = request?.createdAtMs ?? pending?.startedAtMs
  const end = active ? now : request?.updatedAtMs
  const elapsed = startedAt !== undefined && end !== undefined ? Math.max(0, end - startedAt) : null
  const unchanged = request?.updatedAtMs === undefined ? 0 : Math.max(0, now - request.updatedAtMs)
  const disconnected = !online || connection === 'cached' || connection === 'error'
  const delayed = active && unchanged >= (state === 'queued' && !immediate ? 10 : 5) * 60_000
  const value =
    state === 'complete'
      ? 100
      : state === 'uploading' && percent !== null
        ? Math.min(100, Math.max(0, percent))
        : undefined
  const transferElapsed = pending ? Math.max(0, now - pending.startedAtMs) : 0
  const remaining =
    value && value < 100 && transferElapsed >= 3000
      ? Math.ceil((transferElapsed * (100 - value)) / value / 10_000) * 10_000
      : null

  return (
    <div className="upload-progress">
      <div className="upload-progress-heading">
        <strong>{request?.fileName ?? pending?.fileName}</strong>
        <span>{fileSizeLabel(request?.size ?? pending?.size ?? 0)}</span>
      </div>
      <p className="upload-progress-title" role="status">
        {stage.title}
      </p>
      {stage.index >= 0 && (
        <>
          <ol className="upload-steps" aria-label="업로드 처리 단계">
            {steps.map((label, index) => (
              <li
                key={label}
                className={index < stage.index || state === 'complete' ? 'is-done' : ''}
                aria-current={index === stage.index ? 'step' : undefined}
              >
                <span aria-hidden="true">
                  {index < stage.index || state === 'complete' ? '✓' : index + 1}
                </span>
                {label}
              </li>
            ))}
          </ol>
          <div
            className={`upload-meter${value === undefined ? ' is-indeterminate' : ''}${disconnected ? ' is-paused' : ''}`}
            role="progressbar"
            aria-label={state === 'uploading' ? '파일 전송 진행률' : stage.title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
            aria-valuetext={value === undefined ? `${stage.title} · 진행률 확인 중` : `${value}%`}
          >
            <span style={value === undefined ? undefined : { width: `${value}%` }} />
          </div>
        </>
      )}
      <div className="upload-progress-meta">
        <span>
          {state === 'uploading'
            ? value === undefined
              ? '전송률 확인 중'
              : `전송 ${value}%`
            : state === 'complete'
              ? '완료 100%'
              : '처리 상태 자동 확인'}
        </span>
        {elapsed !== null && (
          <span>
            {active ? '경과' : '총 소요'} {duration(elapsed)}
          </span>
        )}
      </div>
      <p className="upload-progress-detail">{stage.detail}</p>
      {state === 'uploading' && percent === null && !pending && (
        <p className="upload-progress-note">
          전송률은 전송을 시작한 창에서 확인할 수 있습니다. 그 창을 닫았다면 대기를 취소하고 다시
          올려 주세요.
        </p>
      )}
      {active && !['cancelled'].includes(state) && (
        <p className="upload-progress-estimate">
          {remaining !== null && state === 'uploading'
            ? `파일 전송 약 ${duration(remaining)} 남음 · 현재 속도 기준. `
            : ''}
          {immediate
            ? '예상 소요: 파일 전송 후 약 1~3분. 작업 대기에 따라 더 걸릴 수 있습니다.'
            : '예약 확인은 5분 간격이며, 처리 시작 후 약 1~3분이 예상됩니다. 실행이 지연될 수 있습니다.'}
        </p>
      )}
      {(!online || connection !== 'live') && (
        <p className="upload-progress-note" role="status">
          {!online
            ? '오프라인입니다. 화면의 상태가 최신이 아닐 수 있습니다. 인터넷 연결을 확인해 주세요.'
            : connection === 'error'
              ? '서버 상태를 확인하지 못했습니다. 연결을 확인한 뒤 페이지를 새로고침해 주세요.'
              : '서버에 연결해 최신 상태를 확인하고 있습니다.'}
        </p>
      )}
      {delayed && !disconnected && (
        <p className="upload-progress-note" role="status">
          마지막 단계 변경 후 {duration(unchanged)}가 지났습니다. 아래 업로드 작업에서 실행 상태를
          확인해 주세요.
        </p>
      )}
    </div>
  )
}
