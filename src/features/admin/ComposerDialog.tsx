import { useEffect, useRef, type ReactNode } from 'react'

/** Native modal semantics provide focus trapping, Escape and an inert background. */
export function ComposerDialog({ label, onClose, restoreFocus, children }: { label: string; onClose: () => void; restoreFocus?: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  const restore = useRef(restoreFocus)
  restore.current = restoreFocus
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.showModal()
    return () => {
      if (previous?.isConnected) previous.focus()
      else restore.current?.()
    }
  }, [])
  return <dialog ref={dialog} className="composer-dialog" aria-label={label} onCancel={event => { event.preventDefault(); close.current() }}>
    {children}
  </dialog>
}
