import { ArrowLeft, MessageCircle, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useConversations, useConversationThread, useMarkConversationRead, useSendMessage } from '../../lib/hooks'
import { cn, timeAgo } from '../../lib/utils'
import { EmptyState, HouseImage, Skeleton, Spinner } from '../ui'

/**
 * Shared conversation UI for boarders and owners.
 *
 * Both roles use the same `conversations` / `messages` tables and the same
 * hooks — the only difference is which side of the thread the signed-in user
 * is on, which the API reports via `viewerIsBoarder`.
 */
export default function MessageCenter({
  userId,
  emptyTitle = 'No messages yet',
  emptySubtitle = 'Start a conversation by tapping “Contact Owner” on a boarding house you are interested in.',
  emptyActionLabel = 'Browse Houses',
  emptyActionTo = '/boarder/browse',
}: {
  userId?: string
  emptyTitle?: string
  emptySubtitle?: string
  emptyActionLabel?: string
  emptyActionTo?: string
}) {
  const [params, setParams] = useSearchParams()
  const { data: conversations, isLoading } = useConversations(userId)

  const [selectedId, setSelectedId] = useState<string | null>(params.get('c'))
  const { data: thread, isLoading: loadingThread } = useConversationThread(selectedId ?? undefined, userId)
  const sendMessage = useSendMessage(userId)
  const markRead = useMarkConversationRead(userId)

  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const list = useMemo(() => conversations ?? [], [conversations])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [thread?.messages.length, selectedId])

  // Keep `?c=` in sync so refreshing keeps the open conversation.
  useEffect(() => {
    const current = params.get('c')
    if (selectedId && current !== selectedId) {
      const next = new URLSearchParams(params)
      next.set('c', selectedId)
      setParams(next, { replace: true })
    }
  }, [selectedId, params, setParams])

  const openConversation = (id: string) => {
    setSelectedId(id)
    setDraft('')
    setError('')
    markRead.mutate(id)
  }

  const send = async () => {
    if (!selectedId || !draft.trim()) return
    setError('')
    try {
      await sendMessage.mutateAsync({ conversationId: selectedId, body: draft.trim() })
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.')
    }
  }

  const selected = list.find((c) => c.id === selectedId) ?? thread?.conversation ?? null

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 rounded-[18px]" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-[18px]" />
        ))}
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState icon={<MessageCircle size={22} />} title={emptyTitle} subtitle={emptySubtitle} />
        <div className="flex justify-center">
          <Link
            to={emptyActionTo}
            className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgb(30_115_232/0.35)] transition hover:-translate-y-0.5 hover:bg-brand-600"
          >
            {emptyActionLabel}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      {/* Conversation list */}
      <div className={cn('rounded-[18px] border border-slate-100 bg-white shadow-card', selected && 'hidden lg:block')}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-navy-800">Conversations</h3>
          <p className="text-xs text-mut">{list.length} thread{list.length === 1 ? '' : 's'}</p>
        </div>
        <div className="max-h-[560px] overflow-y-auto">
          {list.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              className={cn(
                'flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3.5 text-left transition hover:bg-surface',
                selectedId === c.id && 'bg-brand-50/50',
              )}
            >
              <HouseImage src={c.houseImage} alt={c.houseName} className="h-11 w-11 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-bold text-navy-800">{c.houseName}</span>
                  {c.lastMessageAt && <span className="shrink-0 text-[10px] text-mut">{timeAgo(c.lastMessageAt)}</span>}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-ink">
                  {c.viewerIsBoarder ? c.ownerName : c.boarderName}: {c.lastMessage || 'No messages yet'}
                </span>
              </span>
              {c.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {c.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div
        className={cn(
          'flex min-h-[500px] flex-col rounded-[18px] border border-slate-100 bg-white shadow-card',
          !selected && 'hidden lg:flex',
        )}
      >
        {!selected ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div>
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <MessageCircle size={22} />
              </span>
              <p className="font-semibold text-navy-800">Select a conversation</p>
              <p className="mt-1 text-sm text-ink">Choose a thread on the left to read and reply.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-lg p-1.5 text-navy-700 transition hover:bg-navy-50 lg:hidden"
                aria-label="Back to conversations"
              >
                <ArrowLeft size={18} />
              </button>
              <HouseImage src={selected.houseImage} alt={selected.houseName} className="h-10 w-10 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-navy-800">{selected.houseName}</p>
                <p className="truncate text-[11px] text-mut">
                  with {selected.viewerIsBoarder ? selected.ownerName : selected.boarderName}
                </p>
              </div>
              <Link
                to={`/houses/${selected.houseId}`}
                className="hidden rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-navy-700 transition hover:border-brand-300 hover:text-brand-500 sm:block"
              >
                View house
              </Link>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-surface px-4 py-4">
              {loadingThread && !thread ? (
                <div className="flex justify-center py-8">
                  <Spinner className="text-brand-500" />
                </div>
              ) : thread && thread.messages.length > 0 ? (
                thread.messages.map((m) => (
                  <div key={m.id} className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[78%]', m.mine && 'text-right')}>
                      <p
                        className={cn(
                          'whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-card',
                          m.mine ? 'rounded-tr-sm bg-brand-500 text-white' : 'rounded-tl-sm bg-white text-ink',
                        )}
                      >
                        {m.body}
                      </p>
                      <p className="mt-1 text-[10px] text-mut">
                        {m.createdAt ? timeAgo(m.createdAt) : ''}
                        {m.mine && m.isRead ? ' · Read' : ''}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-mut">No messages in this conversation yet.</p>
              )}
            </div>

            <div className="border-t border-slate-100 p-3">
              {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  send()
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  aria-label="Message"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="submit"
                  disabled={sendMessage.isPending || !draft.trim()}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  <Send size={15} /> <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
