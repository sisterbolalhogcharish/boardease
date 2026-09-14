import { ArrowLeft, ArrowRight, Check, CheckCircle2, Download, FileText, Lock, ShieldCheck, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal, Spinner } from '../ui'
import { cn, peso } from '../../lib/utils'

/**
 * GCash payment flow for choosing a plan.
 *
 * Two steps inside one modal: the QR instructions, then the proof-of-payment
 * uploader. The uploader used to live on the page behind this modal, and its
 * render condition made it unreachable — so choosing a plan was a dead end.
 * Everything now happens here, and the receipt is really sent to the admin.
 *
 * Only GCash is offered, hence a single method tile rather than a row of brand
 * logos we have no assets for — the GCash mark is the one logo we ship.
 */
const QR_SRC = '/pictures/instapay.jpg'

/** Official GCash brand mark, in the tile beside the method name. */
const GCASH_MARK_SRC = '/pictures/gcash-mark.svg'

const STEPS = [
  'Save the QR image',
  'Open GCash App, Scan QR',
  'Upload the saved QR',
  'Screenshot your receipt',
]

/** How long each step stays lit before the glow slides down to the next one. */
const STEP_GLOW_MS = 1300

const MAX_RECEIPT_BYTES = 4 * 1024 * 1024

function readReceiptImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file (JPG, PNG, or WebP).'))
      return
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      reject(new Error('Please choose an image under 4 MB.'))
      return
    }
    const reader = new FileReader()
    // Read as-is rather than cropping to a square: a cropped receipt can hide
    // the very details the admin needs to verify.
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read that image. Please try another.'))
    reader.readAsDataURL(file)
  })
}

function GCashMark() {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <img src={GCASH_MARK_SRC} alt="GCash" className="h-7 w-7 object-contain" />
    </span>
  )
}

export default function PaymentModal({
  open,
  onClose,
  planName,
  planPrice,
  submitting,
  error,
  sent,
  onSubmitReceipt,
}: {
  open: boolean
  onClose: () => void
  planName: string
  planPrice: number
  submitting: boolean
  error: string
  /** True once the admin has the receipt — shows the confirmation. */
  sent: boolean
  onSubmitReceipt: (receiptUrl: string) => void
}) {
  const [step, setStep] = useState<'instructions' | 'upload'>('instructions')
  /** Which checklist row the glow is sitting on right now. */
  const [activeStep, setActiveStep] = useState(0)
  const [receiptUrl, setReceiptUrl] = useState('')
  const [localError, setLocalError] = useState('')
  const [reading, setReading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // Every plan choice starts from a clean slate.
  useEffect(() => {
    if (open) {
      setStep('instructions')
      setActiveStep(0)
      setReceiptUrl('')
      setLocalError('')
      setReading(false)
    }
  }, [open])

  // Sweep the glow down the checklist 1 → 4 on a loop, so the eye is walked
  // through every step instead of landing on one static highlight.
  useEffect(() => {
    if (!open || sent || step !== 'instructions') return
    const timer = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % STEPS.length)
    }, STEP_GLOW_MS)
    return () => window.clearInterval(timer)
  }, [open, sent, step])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLocalError('')
    setReading(true)
    try {
      setReceiptUrl(await readReceiptImage(file))
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not read that image.')
    } finally {
      setReading(false)
    }
  }

  const shownError = localError || error

  return (
    <Modal open={open} onClose={onClose} title={sent ? 'Receipt sent' : `Pay for the ${planName} plan`}>
      <div className="space-y-5">
        {/* Amount being paid */}
        <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
          <span className="text-sm font-semibold text-navy-800">{planName} plan</span>
          <span className="text-sm font-bold text-navy-800">
            {peso(planPrice)}
            <span className="font-medium text-mut">/month</span>
          </span>
        </div>

        {shownError && (
          <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-danger">
            {shownError}
          </p>
        )}

        {sent ? (
          /* ---------------- Sent to the admin ---------------- */
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mint-50 text-mint-500">
              <CheckCircle2 size={28} />
            </span>
            <p className="mt-4 font-bold text-navy-800">Your receipt is with the admin</p>
            <p className="mt-1 max-w-sm text-sm text-ink">
              We'll activate your {planName} plan once the payment is verified. You'll get a notification — and you can
              follow the status in your history.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/dashboard/subscription/history"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgb(30_115_232/0.3)] transition hover:-translate-y-0.5 hover:bg-brand-600"
              >
                <FileText size={15} /> View history
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-surface"
              >
                Done
              </button>
            </div>
          </div>
        ) : step === 'instructions' ? (
          /* ---------------- Step 1: pay by QR ---------------- */
          <>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-700">Payment method</p>
              <div className="flex items-center gap-3 rounded-xl border-2 border-brand-400 bg-brand-50/40 px-4 py-3.5">
                <GCashMark />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-navy-800">GCash</p>
                  <p className="text-xs text-mut">Scan the QR below in your GCash app</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-500 px-2.5 py-1 text-[11px] font-bold text-white">
                  <Check size={11} strokeWidth={3} /> Selected
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,172px)_1fr]">
              <div className="space-y-2">
                <div className="rounded-xl border border-slate-200 bg-white p-2">
                  <img
                    src={QR_SRC}
                    alt="GCash QR code — scan to pay"
                    className="h-40 w-full rounded-lg object-contain"
                  />
                </div>
                <a
                  href={QR_SRC}
                  download="boardease-gcash-qr.jpg"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgb(30_115_232/0.3)] transition hover:-translate-y-0.5 hover:bg-brand-600"
                >
                  <Download size={15} /> Save QR
                </a>
              </div>

              <ol className="space-y-1.5">
                {STEPS.map((stepText, index) => {
                  const active = index === activeStep
                  return (
                    <li
                      key={stepText}
                      className={cn(
                        // A transparent ring on the idle rows keeps the box the
                        // same size, so lighting one up never nudges the list.
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 ring-2 transition-all duration-500 ease-out',
                        active
                          ? 'bg-brand-50 ring-brand-300 shadow-[0_0_18px_rgb(30_115_232/0.25)]'
                          : 'bg-transparent ring-transparent',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-500 ease-out',
                          active
                            ? 'scale-110 bg-brand-500 text-white shadow-[0_0_12px_rgb(30_115_232/0.55)]'
                            : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={cn(
                          'text-sm transition-all duration-500 ease-out',
                          active ? 'font-bold text-navy-800' : 'font-normal text-ink',
                        )}
                      >
                        {stepText}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>

            {/* The QR already carries the plan's price, so nobody has to key it in. */}
            <div className="flex items-center gap-2.5 rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-3">
              <Lock size={15} className="shrink-0 text-brand-500" />
              <p className="text-xs font-medium text-navy-800 sm:text-sm">
                The amount is already locked into this QR. You don't need to type it.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <p className="text-center text-sm text-ink">
                Already paid? Enter your proof of payment to unlock access.
              </p>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgb(30_115_232/0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600"
              >
                Enter proof of payment <ArrowRight size={15} />
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-mut">
                <ShieldCheck size={13} /> Payments are subject to verification.
              </p>
            </div>
          </>
        ) : (
          /* ---------------- Step 2: upload the receipt ---------------- */
          <>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleFile} />

            <div className="grid gap-4 sm:grid-cols-[minmax(0,150px)_1fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                <img
                  src={QR_SRC}
                  alt="GCash QR code"
                  className="h-32 w-full rounded-lg object-contain"
                />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-sm font-bold text-navy-800">Upload your proof of payment</p>
                <p className="mt-1 text-xs text-ink">
                  A screenshot of your GCash receipt. JPG, PNG, or WebP, up to 4 MB. The admin verifies it before your
                  plan is activated.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={reading || submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-surface/40 px-6 py-8 text-sm font-semibold text-navy-600 transition hover:border-brand-300 hover:bg-brand-50/30 disabled:opacity-60"
              >
                {reading ? (
                  <>
                    <Spinner className="h-4 w-4" /> Reading…
                  </>
                ) : (
                  <>
                    <Upload size={18} /> {receiptUrl ? 'Choose a different image' : 'Click to upload receipt'}
                  </>
                )}
              </button>

              {receiptUrl && (
                <div className="relative">
                  {/* object-contain so the whole receipt stays visible for review. */}
                  <img
                    src={receiptUrl}
                    alt="Receipt preview"
                    className="h-40 w-full rounded-xl bg-surface object-contain ring-1 ring-slate-200"
                  />
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-mint-50 px-2.5 py-1 text-[11px] font-bold text-mint-600">
                    <FileText size={11} /> Receipt ready
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSubmitReceipt(receiptUrl)}
                  disabled={!receiptUrl || submitting || reading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgb(30_115_232/0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {submitting ? <Spinner className="h-4 w-4" /> : <Upload size={15} />}
                  {submitting ? 'Sending to admin…' : 'Send to admin'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Restart the checklist sweep from step 1 when the user comes back.
                    setActiveStep(0)
                    setStep('instructions')
                  }}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-navy-700 transition hover:bg-surface disabled:opacity-60"
                >
                  <ArrowLeft size={14} /> QR
                </button>
              </div>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-mut">
                <ShieldCheck size={13} /> Payments are subject to verification.
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
