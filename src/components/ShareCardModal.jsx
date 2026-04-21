import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import ShareCard, { CARD_WIDTH, CARD_HEIGHT } from './ShareCard'
import { useToast } from './Toast'

export default function ShareCardModal({
  open,
  onClose,
  streak,
  username,
  logs,
}) {
  const cardRef = useRef(null)
  const [busy, setBusy] = useState(null) // null | 'download' | 'share' | 'copy'
  const [scale, setScale] = useState(1)
  const { show } = useToast()

  // Fit the card inside the viewport. html2canvas captures the real 1200×630
  // regardless of visual scale.
  useEffect(() => {
    if (!open) return
    const fit = () => {
      const maxWidth = Math.min(window.innerWidth - 48, CARD_WIDTH)
      const maxHeight = window.innerHeight - 260
      setScale(Math.min(1, maxWidth / CARD_WIDTH, maxHeight / CARD_HEIGHT))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const render = async () => {
    return html2canvas(cardRef.current, {
      backgroundColor: '#0f0f0f',
      scale: 2,
      logging: false,
      useCORS: true,
      windowWidth: CARD_WIDTH,
      windowHeight: CARD_HEIGHT,
    })
  }

  const toBlob = (canvas) =>
    new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1))

  const handleDownload = async () => {
    setBusy('download')
    try {
      const canvas = await render()
      const blob = await toBlob(canvas)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `devmood-${streak}day-streak.png`
      a.click()
      URL.revokeObjectURL(url)
      show('card downloaded', { variant: 'success' })
    } catch (e) {
      show(`couldn't render — ${e.message}`, { variant: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const handleShare = async () => {
    setBusy('share')
    try {
      const canvas = await render()
      const blob = await toBlob(canvas)
      const file = new File([blob], `devmood-${streak}day-streak.png`, {
        type: 'image/png',
      })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'devmood streak',
          text: `I've logged my dev mood for ${streak} day${streak === 1 ? '' : 's'} straight on devmood.`,
        })
        show('shared', { variant: 'success' })
      } else {
        show('your browser does not support native share — try copy or download', {
          variant: 'info',
        })
      }
    } catch (e) {
      // User cancelled the share sheet → AbortError; don't toast on that.
      if (e?.name !== 'AbortError') {
        show(`share failed — ${e.message}`, { variant: 'error' })
      }
    } finally {
      setBusy(null)
    }
  }

  const handleCopy = async () => {
    setBusy('copy')
    try {
      const canvas = await render()
      const blob = await toBlob(canvas)
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])
        show('card copied — paste anywhere', { variant: 'success' })
      } else {
        show('clipboard not available — try download', { variant: 'info' })
      }
    } catch (e) {
      show(`copy failed — ${e.message}`, { variant: 'error' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-sm font-medium text-neutral-200">
            share your streak
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none text-neutral-500 transition hover:text-white"
            aria-label="close"
          >
            ×
          </button>
        </div>

        {/* Preview — scaled visually but real pixels stay 1200×630 */}
        <div
          className="mx-auto rounded-2xl border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.7)]"
          style={{
            width: CARD_WIDTH * scale,
            height: CARD_HEIGHT * scale,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <ShareCard
              ref={cardRef}
              streak={streak}
              username={username}
              logs={logs}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={handleDownload}
            disabled={busy !== null}
            className="rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-medium text-black transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === 'download' ? 'rendering…' : '↓ download png'}
          </button>
          <button
            onClick={handleShare}
            disabled={busy !== null}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-neutral-200 transition hover:border-teal-500/40 hover:text-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === 'share' ? 'rendering…' : '↗ share…'}
          </button>
          <button
            onClick={handleCopy}
            disabled={busy !== null}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-neutral-200 transition hover:border-teal-500/40 hover:text-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === 'copy' ? 'rendering…' : '⧉ copy image'}
          </button>
        </div>
        <p className="mt-3 text-center text-[11px] text-neutral-600">
          card renders at 1200×630 · perfect for twitter, linkedin, slack
        </p>
      </div>
    </div>
  )
}
