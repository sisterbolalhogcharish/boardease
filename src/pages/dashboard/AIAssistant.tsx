import { motion } from 'framer-motion'
import { Bot, Send, ShieldCheck, Sparkles, User } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAssistant } from '../../lib/hooks'
import { cn, peso } from '../../lib/utils'
import type { AIAnswer, AICard, ChatMessage } from '../../server/types'

const AI_SUGGESTIONS = [
  'Show revenue trend',
  'List overdue payments',
  'Room occupancy report',
  'Who are the boarders?',
  'Show payment summary',
  'What are the most popular rooms?',
]

const TONE: Record<NonNullable<AICard['tone']>, string> = {
  green: 'border-mint-100 bg-mint-50/60 text-mint-700',
  blue: 'border-brand-100 bg-brand-50/60 text-brand-700',
  orange: 'border-amber-100 bg-amber-50/60 text-amber-soft',
  red: 'border-red-100 bg-red-50/60 text-danger',
  navy: 'border-navy-100 bg-navy-50/60 text-navy-800',
}

const chartTooltip = {
  borderRadius: 12,
  border: '1px solid #EEF2F7',
  fontSize: 12,
  boxShadow: '0 8px 30px rgba(11,45,99,0.12)',
} as const

/* ------------------------- Answer renderer ------------------------ */
function AnswerChart({ chart }: { chart: NonNullable<AIAnswer['chart']> }) {
  const common = (
    <>
      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => (Number(v) >= 1000 ? `₱${v / 1000}k` : String(v))} />
      <Tooltip contentStyle={chartTooltip} formatter={(v) => (chart.kind === 'bar' || chart.kind === 'area' ? peso(Number(v)) : [String(v), ''])} />
    </>
  )
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-white">
      <p className="border-b border-slate-50 px-4 py-2.5 text-xs font-bold text-navy-800">{chart.title}</p>
      <div className="h-48 p-2">
        <ResponsiveContainer width="100%" height="100%">
          {chart.kind === 'pie' ? (
            <PieChart>
              <Pie data={chart.data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={4}>
                {chart.data.map((_, i) => (
                  <Cell key={i} fill={['#1E73E8', '#33C7A5', '#F59E0B', '#0B2D63', '#EF4444'][i % 5]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltip} />
            </PieChart>
          ) : chart.kind === 'line' ? (
            <LineChart data={chart.data}>
              {common}
              <Line type="monotone" dataKey="value" stroke="#1E73E8" strokeWidth={2.5} dot={{ r: 3, fill: '#1E73E8' }} />
            </LineChart>
          ) : chart.kind === 'area' ? (
            <AreaChart data={chart.data}>
              <defs>
                <linearGradient id="aiArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#33C7A5" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#33C7A5" stopOpacity={0} />
                </linearGradient>
              </defs>
              {common}
              <Area type="monotone" dataKey="value" stroke="#33C7A5" strokeWidth={2.5} fill="url(#aiArea)" />
            </AreaChart>
          ) : (
            <BarChart data={chart.data}>
              {common}
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#1E73E8" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function AnswerBody({ answer, onSuggest }: { answer: AIAnswer; onSuggest: (q: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-navy-700">{answer.summary}</p>

      {answer.cards && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {answer.cards.map((c) => (
            <div key={c.label} className={cn('rounded-xl border p-3', TONE[c.tone ?? 'navy'])}>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{c.label}</p>
              <p className="mt-0.5 text-lg font-extrabold">{c.value}</p>
              {c.hint && <p className="mt-0.5 text-[10px] opacity-70">{c.hint}</p>}
            </div>
          ))}
        </div>
      )}

      {answer.columns && answer.rows && (
        <div className="max-h-64 overflow-auto rounded-xl border border-slate-100 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface">
              <tr>
                {answer.columns.map((c) => (
                  <th key={c} className="px-3 py-2 font-bold text-navy-800">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {answer.rows.map((row, i) => (
                <tr key={i} className="border-t border-slate-50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-ink">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {answer.chart && <AnswerChart chart={answer.chart} />}

      {answer.suggested && answer.suggested.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {answer.suggested.slice(0, 4).map((s) => (
            <button
              key={s}
              onClick={() => onSuggest(s)}
              className="rounded-full border border-brand-100 bg-brand-50/70 px-3 py-1.5 text-[11px] font-semibold text-brand-500 transition hover:bg-brand-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------ Page ------------------------------ */
const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your BoardEase AI assistant. I can answer questions using only your boarding house data — payments, rooms, boarders, contracts, and analytics. Try asking:",
  createdAt: new Date().toISOString(),
}

export default function AIAssistant() {
  const [params] = useSearchParams()
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const assistant = useAssistant()
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoSent = useRef(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const send = (text: string) => {
    const q = text.trim()
    if (!q || typing) return
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: q, createdAt: new Date().toISOString() }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setTyping(true)
    assistant.mutate(q, {
      onSuccess: (answer) => {
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', content: q, answer, createdAt: new Date().toISOString() }])
        setTyping(false)
      },
      onError: () => {
        setMessages((m) => [
          ...m,
          { id: `a-${Date.now()}`, role: 'assistant', content: q, answer: { summary: 'Sorry, I had trouble reading the data. Please try again.', type: 'text' as const }, createdAt: new Date().toISOString() },
        ])
        setTyping(false)
      },
    })
  }

  useEffect(() => {
    const prompt = params.get('prompt')
    if (prompt && !autoSent.current) {
      autoSent.current = true
      send(prompt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[480px] flex-col overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mint-400 to-brand-500 text-white">
            <Bot size={20} />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-mint-400 ring-2 ring-white" />
          </span>
          <div>
            <p className="font-bold text-navy-800">BoardEase AI Assistant</p>
            <p className="flex items-center gap-1 text-xs text-mut">
              <ShieldCheck size={11} className="text-mint-600" /> Reads only your boarding house data
            </p>
          </div>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-mint-50 px-3 py-1.5 text-[11px] font-bold text-mint-600 sm:inline-flex">
          <Sparkles size={12} /> synced
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-surface/50 p-5">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}
          >
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white',
                m.role === 'user' ? 'bg-gradient-to-br from-navy-800 to-navy-600' : 'bg-gradient-to-br from-mint-400 to-brand-500',
              )}
            >
              {m.role === 'user' ? <User size={15} /> : <Bot size={15} />}
            </span>
            <div
              className={cn(
                'max-w-[82%] rounded-2xl px-4 py-3 shadow-sm',
                m.role === 'user' ? 'rounded-tr-md bg-brand-500 text-white' : 'rounded-tl-md border border-slate-100 bg-white',
              )}
            >
              {m.role === 'user' ? (
                <p className="text-sm leading-relaxed">{m.content}</p>
              ) : m.answer ? (
                <AnswerBody answer={m.answer} onSuggest={send} />
              ) : (
                <p className="text-sm leading-relaxed text-navy-700">{m.content}</p>
              )}
            </div>
          </motion.div>
        ))}

        {typing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-mint-400 to-brand-500 text-white">
              <Bot size={15} />
            </span>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-slate-100 bg-white px-4 py-3 shadow-sm">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                  className="h-2 w-2 rounded-full bg-brand-400"
                />
              ))}
            </div>
          </motion.div>
        )}

        {messages.length === 1 && !typing && (
          <div className="flex flex-wrap gap-2 pt-2">
            {AI_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-navy-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-500 hover:shadow-md"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="border-t border-slate-100 bg-white p-4">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your boarding house… e.g. Who hasn't paid?"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-[0_8px_20px_rgb(30_115_232/0.35)] transition hover:bg-brand-600 disabled:opacity-40"
            aria-label="Send"
          >
            <Send size={17} />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-mut">
          Answers are generated from your live records — payments, rooms, boarders, and contracts. AI can make mistakes, so verify important figures.
        </p>
      </form>
    </div>
  )
}
