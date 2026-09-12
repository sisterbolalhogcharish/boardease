import { motion } from 'framer-motion'
import { MessageCircle, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useStartConversation } from '../../lib/hooks'
import type { HouseCard } from '../../lib/api'
import { Modal } from '../ui'

const QUICK_QUESTIONS = [
  'Is the room still available?',
  'Are visitors allowed?',
  'Is cooking allowed?',
  'Can I move in next month?',
]

export default function ContactOwnerModal({
  open,
  onClose,
  house,
}: {
  open: boolean
  onClose: () => void
  house: HouseCard | null
}) {
  const { user } = useAuth()
  const userId = user?.id?.toString()
  const navigate = useNavigate()
  const startConversation = useStartConversation(userId)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sentId, setSentId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setMessage(house ? `Hi ${house.owner?.split(' ')[0] ?? ''}! I'm interested in renting at ${house.name}. Is there an available room?` : '')
      setError('')
      setSentId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, house?.id])

  if (!house) return null

  const send = async () => {
    if (!userId) {
      setError('Please sign in as a boarder to message the owner.')
      return
    }
    if (!message.trim()) {
      setError('Please write a message first.')
      return
    }
    setError('')
    try {
      const conversation = await startConversation.mutateAsync({ userId, houseId: house.id, body: message.trim() })
      setSentId(conversation.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message. Please try again.')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Contact ${house.owner?.split(' ')[0] || 'Owner'}`}>
      {sentId ? (
        <div className="flex flex-col items-center py-4 text-center">
          <motion.span
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-mint-50 text-mint-600"
          >
            <Send size={22} />
          </motion.span>
          <h4 className="mt-4 text-lg font-bold text-navy-800">Message sent!</h4>
          <p className="mt-1 max-w-sm text-sm text-ink">
            {house.owner || 'The owner'} will get back to you. You can follow the conversation and see replies under
            Messages.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => {
                onClose()
                navigate(`/boarder/messages?c=${sentId}`)
              }}
              className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Open Messages
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-navy-800 transition hover:border-slate-300"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink">
            Ask {house.owner || 'the owner'} about {house.name}. Keep it to a short inquiry — BoardEase messaging is
            text-only.
          </p>

          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setMessage((prev) => (prev.trim() ? `${prev.trim()}\n${q}` : q))}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-navy-700 transition hover:border-brand-300 hover:text-brand-500"
              >
                {q}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="contact-message" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">
              Your message <span className="text-danger">*</span>
            </label>
            <textarea
              id="contact-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-navy-800 transition hover:border-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={send}
              disabled={startConversation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              <MessageCircle size={15} /> {startConversation.isPending ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
