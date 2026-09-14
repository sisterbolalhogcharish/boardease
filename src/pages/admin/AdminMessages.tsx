import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Crown, Mail, MessageSquare, Search, Send, ShieldCheck } from 'lucide-react'
import { EmptyState, Spinner } from '../../components/ui'
import { useAdminMessages, useReplyAdminMessage } from '../../lib/hooks'
import { cn } from '../../lib/utils'

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function AdminMessages() {
  const [filter, setFilter] = useState<'open' | 'replied' | 'all'>('open')
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const { data: messages, isLoading, isError } = useAdminMessages()
  const reply = useReplyAdminMessage()

  const filtered = (messages ?? []).filter((m) => {
    if (filter === 'open' && m.reply) return false
    if (filter === 'replied' && !m.reply) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      m.landlordName.toLowerCase().includes(q) ||
      m.landlordEmail.toLowerCase().includes(q) ||
      m.body.toLowerCase().includes(q) ||
      m.plan.toLowerCase().includes(q)
    )
  })

  const openCount = (messages ?? []).filter((m) => !m.reply).length

  const send = async (id: string) => {
    setError('')
    const body = (drafts[id] ?? '').trim()
    if (!body) {
      setError('Please write a reply before sending.')
      return
    }
    try {
      await reply.mutateAsync({ id, reply: body })
      setDrafts((d) => ({ ...d, [id]: '' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reply.')
    }
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by landlord, email, plan or message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {(
            [
              ['open', openCount > 0 ? `Open (${openCount})` : 'Open'],
              ['replied', 'Replied'],
              ['all', 'All'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                filter === key ? 'bg-brand-500 text-white' : 'text-ink hover:bg-slate-50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-[18px] bg-slate-100" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<Mail size={24} />}
          title="Could not load messages"
          subtitle="The admin inbox endpoint did not respond. Try reloading the page."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={24} />}
          title={filter === 'open' ? 'No messages waiting' : 'No messages found'}
          subtitle={
            filter === 'open'
              ? 'Landlord questions about availing a plan land here for you to answer.'
              : 'No messages match your search and filter.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((m, i) => {
            const sending = reply.isPending && reply.variables?.id === m.id
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-navy-800">{m.landlordName || 'Landlord'}</p>
                      {m.plan && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-500">
                          <Crown size={11} /> {m.plan.charAt(0).toUpperCase() + m.plan.slice(1)} plan
                        </span>
                      )}
                      {m.reply ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2.5 py-1 text-[11px] font-bold text-mint-600">
                          <CheckCircle2 size={11} /> Replied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600">
                          Awaiting reply
                        </span>
                      )}
                    </div>
                    {m.landlordEmail && <p className="mt-0.5 text-sm text-ink">{m.landlordEmail}</p>}
                    <p className="text-[11px] text-mut">Sent {formatDate(m.createdAt)}</p>
                  </div>
                </div>

                <p className="mt-3 rounded-xl bg-surface px-4 py-3 text-sm text-navy-800">{m.body}</p>

                {m.reply ? (
                  <div className="mt-3 rounded-xl border border-mint-100 bg-mint-50/60 px-4 py-3">
                    <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-mint-600">
                      <ShieldCheck size={11} /> You replied
                    </span>
                    <p className="text-sm text-navy-800">{m.reply}</p>
                    <span className="mt-1 block text-[10px] text-mut">{formatDate(m.repliedAt)}</span>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-700">
                        Reply
                      </span>
                      <textarea
                        rows={3}
                        value={drafts[m.id] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                        placeholder={`Reply to ${m.landlordName || 'this landlord'}…`}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-navy-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
                      />
                    </label>
                    <button
                      onClick={() => send(m.id)}
                      disabled={sending}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgb(30_115_232/0.3)] transition hover:-translate-y-0.5 hover:bg-brand-600 disabled:opacity-60"
                    >
                      {sending ? <Spinner className="h-4 w-4" /> : <Send size={15} />}
                      {sending ? 'Sending…' : 'Send reply'}
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
