import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

const VARIANTS = {
  success:
    'border-teal-400/30 bg-teal-500/[0.08] text-teal-100 shadow-[0_0_48px_rgba(20,184,166,0.3),0_1px_0_rgba(255,255,255,0.06)_inset]',
  milestone:
    'border-teal-300/60 bg-gradient-to-b from-teal-400/20 to-teal-500/10 text-teal-50 shadow-[0_0_72px_rgba(20,184,166,0.5),0_1px_0_rgba(255,255,255,0.1)_inset]',
  error:
    'border-red-400/30 bg-red-500/[0.08] text-red-100 shadow-[0_0_32px_rgba(239,68,68,0.25)]',
  info:
    'border-white/[0.08] bg-[#17171a]/90 text-neutral-100 shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message, opts = {}) => {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Math.random())
      const toast = {
        id,
        message,
        variant: opts.variant ?? 'success',
        icon: opts.icon,
      }
      setToasts((prev) => [...prev, toast])
      setTimeout(() => dismiss(id), opts.duration ?? 3500)
      return id
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-8">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`animate-slide-up pointer-events-auto rounded-full border px-5 py-3 text-sm backdrop-blur-xl transition hover:brightness-110 ${
            VARIANTS[t.variant] ?? VARIANTS.success
          }`}
        >
          <span className="flex items-center gap-2.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                t.variant === 'milestone'
                  ? 'animate-ping bg-teal-200'
                  : 'animate-pulse bg-current'
              }`}
            />
            {t.icon && <span>{t.icon}</span>}
            <span className="font-medium">{t.message}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
