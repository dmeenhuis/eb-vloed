import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { X } from 'lucide-react'

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-3xl bg-card p-4 shadow-[0_1px_2px_rgba(60,20,40,0.04),0_4px_16px_rgba(60,20,40,0.04)]', className)}>
      {(title || action) && (
        <div className="mb-3 flex min-h-7 items-center justify-between gap-2">
          {title && <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-rose-500' : 'bg-sunken ring-1 ring-line')}
    >
      <span className={cx('absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
    </button>
  )
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  className,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-40',
        variant === 'primary' && 'bg-rose-500 text-white shadow-sm shadow-rose-500/30',
        variant === 'secondary' && 'bg-sunken text-ink',
        variant === 'danger' && 'bg-red-500/10 text-red-600 dark:text-red-400',
        variant === 'ghost' && 'text-muted',
        className,
      )}
    >
      {children}
    </button>
  )
}

let modalCounter = 0

/**
 * Lets the Android back button / back gesture close an open modal: opening pushes a history entry, going back pops it.
 * Closing in any other way removes the entry again, unless it was already replaced (e.g. by navigating to another day).
 */
function useCloseOnBack(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    const id = ++modalCounter
    history.pushState({ modal: id }, '')
    const onPop = () => onCloseRef.current()
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (history.state?.modal === id) history.back()
    }
  }, [open])
}

const DRAG_START_PX = 8
const CLOSE_FRACTION = 0.25
const FLICK_VELOCITY = 0.6 // px per ms

/**
 * Swipe a bottom sheet down to close it. Dragging works from the header (handle + title) and from the content
 * when that is scrolled to the top; otherwise a downward swipe simply scrolls. Not used for the centered dialog on wide screens.
 */
function useDragToClose(
  open: boolean,
  onClose: () => void,
  refs: { sheet: RefObject<HTMLDivElement | null>; header: RefObject<HTMLDivElement | null>; body: RefObject<HTMLDivElement | null>; backdrop: RefObject<HTMLDivElement | null> },
) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const sheet = refs.sheet.current
    if (!open || !sheet) return

    let start: { x: number; y: number; fromHeader: boolean; inBody: boolean } | null = null
    let dragging = false
    let offset = 0
    let last = { y: 0, t: 0, v: 0 }

    const move = (y: number, animate: boolean) => {
      const transition = animate ? '220ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
      sheet.style.transition = animate ? `transform ${transition}` : 'none'
      sheet.style.transform = y > 0 ? `translateY(${y}px)` : ''
      const backdrop = refs.backdrop.current
      if (backdrop) {
        backdrop.style.transition = animate ? `background-color ${transition}` : 'none'
        backdrop.style.backgroundColor = `rgb(0 0 0 / ${0.4 * (1 - Math.min(y / sheet.offsetHeight, 1))})`
      }
    }

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || window.matchMedia('(min-width: 640px)').matches) return
      const t = e.touches[0]
      const target = e.target as Node
      start = { x: t.clientX, y: t.clientY, fromHeader: !!refs.header.current?.contains(target), inBody: !!refs.body.current?.contains(target) }
      dragging = false
      offset = 0
      last = { y: t.clientY, t: e.timeStamp, v: 0 }
    }

    const onMove = (e: TouchEvent) => {
      if (!start) return
      const t = e.touches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (!dragging) {
        if (Math.abs(dx) < DRAG_START_PX && Math.abs(dy) < DRAG_START_PX) return
        const bodyAtTop = (refs.body.current?.scrollTop ?? 0) <= 0
        const downwards = dy > 0 && Math.abs(dy) > Math.abs(dx)
        if (!downwards || !(start.fromHeader || (start.inBody && bodyAtTop))) {
          start = null
          return
        }
        dragging = true
      }
      e.preventDefault()
      offset = Math.max(0, dy)
      const dt = e.timeStamp - last.t
      if (dt > 0) last = { y: t.clientY, t: e.timeStamp, v: (t.clientY - last.y) / dt }
      move(offset, false)
    }

    const onEnd = () => {
      const wasDragging = dragging
      start = null
      dragging = false
      if (!wasDragging) return
      if (offset > sheet.offsetHeight * CLOSE_FRACTION || last.v > FLICK_VELOCITY) {
        move(sheet.offsetHeight, true)
        window.setTimeout(() => onCloseRef.current(), 200)
      } else {
        move(0, true)
      }
    }

    sheet.addEventListener('touchstart', onStart, { passive: true })
    sheet.addEventListener('touchmove', onMove, { passive: false })
    sheet.addEventListener('touchend', onEnd)
    sheet.addEventListener('touchcancel', onEnd)
    return () => {
      sheet.removeEventListener('touchstart', onStart)
      sheet.removeEventListener('touchmove', onMove)
      sheet.removeEventListener('touchend', onEnd)
      sheet.removeEventListener('touchcancel', onEnd)
    }
  }, [open, refs.sheet, refs.header, refs.body, refs.backdrop])
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  tall,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Stays visible below the scrolling content. */
  footer?: ReactNode
  /** Fixed (near) full height, e.g. for long lists, so the sheet doesn't resize while filtering. */
  tall?: boolean
}) {
  const sheet = useRef<HTMLDivElement>(null)
  const header = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  useCloseOnBack(open, onClose)
  useDragToClose(open, onClose, { sheet, header, body, backdrop })
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  const safeBottom = 'pb-[max(1.25rem,env(safe-area-inset-bottom))]'
  return (
    <div ref={backdrop} className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'animate-slide-up flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card sm:rounded-3xl',
          tall ? 'h-[90dvh]' : 'max-h-[90dvh]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={header} className="shrink-0 touch-none px-5 pt-2 pb-3 select-none sm:pt-5">
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/20 sm:hidden" aria-hidden />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Sluiten" className="-mr-2 grid size-10 place-items-center rounded-full text-muted">
              <X size={20} />
            </button>
          </div>
        </div>
        <div ref={body} className={cx('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5', footer ? 'pb-2' : safeBottom)}>
          {children}
        </div>
        {footer && <div className={cx('shrink-0 border-t border-line px-5 pt-3', safeBottom)}>{footer}</div>}
      </div>
    </div>
  )
}

interface ConfirmOptions {
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
}

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false)
export const useConfirm = () => useContext(ConfirmContext)

const ToastContext = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastContext)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [confirm, setConfirm] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const ask = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setConfirm({ ...o, resolve })), [])
  const close = (v: boolean) => {
    confirm?.resolve(v)
    setConfirm(null)
  }

  const show = useCallback((msg: string) => {
    window.clearTimeout(timer.current)
    setToast({ msg, id: Date.now() })
    timer.current = window.setTimeout(() => setToast(null), 3000)
  }, [])

  return (
    <ConfirmContext.Provider value={ask}>
      <ToastContext.Provider value={show}>
        {children}
        <Modal open={!!confirm} onClose={() => close(false)} title={confirm?.title ?? ''}>
          <div className="text-sm leading-relaxed text-muted">{confirm?.message}</div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button onClick={() => close(false)}>Annuleren</Button>
            <Button variant={confirm?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
              {confirm?.confirmLabel ?? 'Doorgaan'}
            </Button>
          </div>
        </Modal>
        {toast && (
          <div className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[60] flex justify-center px-4">
            <div key={toast.id} className="animate-slide-up rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-bg shadow-lg">
              {toast.msg}
            </div>
          </div>
        )}
      </ToastContext.Provider>
    </ConfirmContext.Provider>
  )
}
