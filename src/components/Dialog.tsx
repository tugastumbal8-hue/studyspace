import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  wide?: boolean
  children: ReactNode
}

export function Dialog({ open, onClose, title, wide, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
      el.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={wide ? 'wide' : undefined}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {open && (
        <div className="dialog-card glass-strong">
          <div className="dialog-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

interface ConfirmProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Hapus', onConfirm, onClose }: ConfirmProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="muted">{message}</p>
      <div className="dialog-actions">
        <button type="button" className="btn" data-autofocus onClick={onClose}>
          Batal
        </button>
        <button type="button" className="btn btn-danger" onClick={() => void onConfirm()}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
