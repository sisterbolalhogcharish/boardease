import { AnimatePresence, motion } from 'framer-motion'
import { Bot, HelpCircle, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useHouses } from '../../lib/hooks'
import { cn, peso } from '../../lib/utils'
import type { HouseCard } from '../../lib/api'

const GREETING =
  "Hi! I'm the BoardEase Virtual Boarding Assistant. I can help you find information about boarding houses, reservations, amenities, and house rules."

const STARTER_QUESTIONS = [
  'Is there an available room?',
  'What is the monthly rent?',
  'What amenities are available?',
  'What are the house rules?',
  'How do I reserve a room?',
  'How can I contact the owner?',
  'Where can I find boarding houses in Larena?',
]

interface AssistantReply {
  text: string
  links?: { label: string; to: string }[]
  suggested?: string[]
}

interface ChatBubble {
  id: number
  role: 'user' | 'assistant'
  text: string
  links?: { label: string; to: string }[]
}

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w))

/** Rule-based FAQ answers built ONLY from public boarding-house data. */
export function answerQuestion(question: string, houses: HouseCard[], isBoarder: boolean): AssistantReply {
  const q = question.toLowerCase().trim()
  const available = houses.filter((h) => h.vacant > 0)

  const matchingHouse = houses.find((h) => h.name && q.includes(h.name.toLowerCase()))

  if (has(q, 'available', 'vacancy', 'vacant', 'bakante', 'free room', 'open room', 'any room')) {
    if (houses.length === 0) {
      return { text: 'There are no boarding houses registered in BoardEase yet. Please check back soon.' }
    }
    if (available.length === 0) {
      return {
        text: 'None of the registered boarding houses have vacant beds right now. You can still save them to your favorites — we will notify you when a room becomes available.',
        suggested: ['What is the monthly rent?', 'How do I contact the owner?'],
      }
    }
    const list = available
      .slice(0, 4)
      .map((h) => `• ${h.name} — ${h.vacant} bed${h.vacant === 1 ? '' : 's'} available (${peso(h.monthlyRent)}/month), ${h.barangay}, ${h.municipality}`)
      .join('\n')
    return {
      text: `${available.length} boarding house${available.length === 1 ? '' : 's'} currently have vacant beds:\n${list}`,
      links: available.slice(0, 3).map((h) => ({ label: `View ${h.name}`, to: `/houses/${h.id}` })),
      suggested: ['What is the monthly rent?', 'What amenities are available?', 'How do I reserve a room?'],
    }
  }

  if (has(q, 'rent', 'price', 'rate', 'cost', 'monthly', 'bayad', 'budget')) {
    if (houses.length === 0) return { text: 'No boarding house rates are published yet.' }
    const cheapest = [...houses].sort((a, b) => a.monthlyRent - b.monthlyRent)[0]
    const dearest = [...houses].sort((a, b) => b.monthlyRent - a.monthlyRent)[0]
    return {
      text: `Published monthly rates range from ${peso(cheapest.monthlyRent)} (${cheapest.name}) to ${peso(dearest.monthlyRent)} (${dearest.name}). Actual rent depends on the room type and how many beds are shared — each house page lists its room rates.`,
      links: [{ label: 'Browse Houses', to: '/boarder/browse' }],
      suggested: ['Is there an available room?', 'What amenities are available?'],
    }
  }

  if (has(q, 'amenit', 'wifi', 'wi-fi', 'aircon', 'kitchen', 'laundry', 'parking', 'pet')) {
    if (houses.length === 0) return { text: 'No amenities are published yet.' }
    const wifi = houses.filter((h) => h.wifi).length
    const aircon = houses.filter((h) => h.aircon).length
    const kitchen = houses.filter((h) => h.kitchen).length
    const laundry = houses.filter((h) => h.laundry).length
    const parking = houses.filter((h) => h.parking).length
    return {
      text: `Across ${houses.length} registered boarding house${houses.length === 1 ? '' : 's'}: ${wifi} offer WiFi, ${aircon} have aircon, ${kitchen} have a kitchen, ${laundry} offer laundry, and ${parking} have parking. Open a boarding house page for its exact amenity list.`,
      links: [{ label: 'Browse Houses', to: '/boarder/browse' }],
      suggested: ['Is there an available room?', 'What are the house rules?'],
    }
  }

  if (has(q, 'rule', 'curfew', 'visitor', 'policy', 'allowed')) {
    if (matchingHouse) {
      const rules = matchingHouse.rules?.length ? matchingHouse.rules.map((r) => `• ${r}`).join('\n') : '• No specific rules were published.'
      return {
        text: `${matchingHouse.name} house rules:\n${rules}\n\nCurfew: ${matchingHouse.curfew || 'not specified'}\nVisitors: ${matchingHouse.visitorPolicy || 'please ask the owner'}`,
        links: [{ label: `View ${matchingHouse.name}`, to: `/houses/${matchingHouse.id}` }],
        suggested: ['How do I contact the owner?'],
      }
    }
    return {
      text: 'House rules are set by each boarding house owner and are listed on the boarding house page — including curfew and the visitor policy. Open a house and check the "House rules" section.',
      links: [{ label: 'Browse Houses', to: '/boarder/browse' }],
      suggested: ['What are the house rules?', 'How do I contact the owner?'],
    }
  }

  if (has(q, 'reserve', 'reservation', 'book', 'apply', 'request room', 'how do i get a room')) {
    return {
      text: 'To reserve a room: open Browse Houses, choose a boarding house, pick an available room, then tap "Request Reservation". Review the details and submit. Your request goes to the owner as PENDING — they will approve or decline it, and you will get a notification either way. BoardEase never asks for online payment: rent is settled directly with the owner.',
      links: [
        { label: 'Browse Houses', to: '/boarder/browse' },
        ...(isBoarder ? [{ label: 'My Reservations', to: '/boarder/reservations' }] : []),
      ],
      suggested: ['How can I contact the owner?', 'What is the monthly rent?'],
    }
  }

  if (has(q, 'document', 'requirement', 'id ', 'enrollment')) {
    return {
      text: 'BoardEase does not collect documents online. Each owner sets their own requirements, so please use "Contact Owner" on the boarding house page to ask what they need (usually a valid ID and a guardian contact).',
      links: [{ label: 'Browse Houses', to: '/boarder/browse' }],
      suggested: ['How do I reserve a room?', 'How can I contact the owner?'],
    }
  }

  if (has(q, 'contact', 'owner', 'message', 'landlord', 'chat', 'call')) {
    return {
      text: 'Open a boarding house page and tap "Contact Owner" to send a message. Your conversation appears under Messages, where you can also see the owner\u2019s replies. You can ask things like "Is the room still available?" or "Are visitors allowed?".',
      links: [
        { label: 'Browse Houses', to: '/boarder/browse' },
        ...(isBoarder ? [{ label: 'Messages', to: '/boarder/messages' }] : []),
      ],
      suggested: ['Is there an available room?', 'What are the house rules?'],
    }
  }

  if (has(q, 'larena', 'siquijor', 'san juan', 'lazi', 'maria', 'location', 'where', 'nearby', 'map')) {
    const larena = houses.filter((h) => h.municipality?.toLowerCase() === 'larena')
    return {
      text: larena.length
        ? `There ${larena.length === 1 ? 'is' : 'are'} ${larena.length} boarding house${larena.length === 1 ? '' : 's'} registered in Larena: ${larena
            .map((h) => `${h.name} (${h.barangay})`)
            .join(', ')}.`
        : 'No boarding houses are registered in Larena yet. You can browse other municipalities in Siquijor and filter by location.',
      links: [
        { label: 'Browse Houses', to: '/boarder/browse' },
        ...(larena[0] ? [{ label: `View ${larena[0].name}`, to: `/houses/${larena[0].id}` }] : []),
      ],
      suggested: ['Is there an available room?', 'What is the monthly rent?'],
    }
  }

  if (has(q, 'favorite', 'save', 'compare')) {
    return {
      text: 'Tap the heart on any boarding house card to save it to Favorites, and the arrows button to add it to Compare (up to 4 houses side by side). Both are in the boarder sidebar.',
      links: isBoarder ? [{ label: 'Favorites', to: '/boarder/favorites' }] : [{ label: 'Browse Houses', to: '/search' }],
      suggested: ['How do I reserve a room?'],
    }
  }

  if (has(q, 'payment', 'pay', 'gcash', 'due')) {
    return {
      text: 'Rent payments are recorded by the boarding house owner. If you have an active accommodation you can see your own payment history and the next due date under "My Payments" / "My Home". BoardEase does not process online payments — there is no GCash, card or bank checkout.',
      links: isBoarder ? [{ label: 'My Payments', to: '/boarder/payments' }] : [],
      suggested: ['Is there an available room?'],
    }
  }

  if (has(q, 'review', 'rating', 'feedback')) {
    return {
      text: 'You can rate a boarding house from 1 to 5 stars and write about your stay under Reviews. Owners can reply to your review, and your reviews are private to your account.',
      links: isBoarder ? [{ label: 'My Reviews', to: '/boarder/reviews' }] : [{ label: 'Browse Houses', to: '/search' }],
      suggested: ['How do I reserve a room?'],
    }
  }

  if (has(q, 'hi', 'hello', 'hey', 'help', 'what can you do', 'good morning', 'salamat')) {
    return {
      text: 'I can answer questions about registered boarding houses, rent and room availability, amenities, house rules, reservations, contacting owners, and how to use BoardEase.',
      suggested: STARTER_QUESTIONS.slice(0, 4),
    }
  }

  return {
    text: "I don't have enough information to answer that. You may contact the boarding house owner for more details.",
    suggested: STARTER_QUESTIONS.slice(0, 4),
  }
}

export default function VirtualAssistant() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatBubble[]>([])
  const [suggested, setSuggested] = useState<string[]>(STARTER_QUESTIONS)
  const { user } = useAuth()
  const { data: houses } = useHouses()
  const scrollRef = useRef<HTMLDivElement>(null)
  const seq = useRef(0)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open])

  const ask = (question: string) => {
    const trimmed = question.trim()
    if (!trimmed) return
    const reply = answerQuestion(trimmed, houses ?? [], user?.role === 'boarder')
    setMessages((prev) => [
      ...prev,
      { id: ++seq.current, role: 'user', text: trimmed },
      { id: ++seq.current, role: 'assistant', text: reply.text, links: reply.links },
    ])
    setSuggested(reply.suggested ?? STARTER_QUESTIONS.slice(0, 4))
    setInput('')
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close BoardEase assistant' : 'Open BoardEase Virtual Boarding Assistant'}
        className="fixed bottom-4 right-4 z-[92] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-mint-400 text-white shadow-float transition hover:scale-105"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-mint-400 ring-2 ring-white" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 z-[93] flex max-h-[70vh] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-float"
            role="dialog"
            aria-label="BoardEase Virtual Boarding Assistant"
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-br from-navy-800 to-brand-600 px-4 py-3.5 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                <Bot size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">Virtual Boarding Assistant</p>
                <p className="text-[11px] text-white/70">FAQ helper · uses registered BoardEase data</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 transition hover:bg-white/15">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-surface px-4 py-4">
              <div className="flex gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                  <Bot size={14} />
                </span>
                <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-ink shadow-card">
                  {GREETING}
                </p>
              </div>

              {messages.map((m) => (
                <div key={m.id} className={cn('flex gap-2', m.role === 'user' && 'justify-end')}>
                  {m.role === 'assistant' && (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                      <Bot size={14} />
                    </span>
                  )}
                  <div className={cn('max-w-[85%]', m.role === 'user' && 'text-right')}>
                    <p
                      className={cn(
                        'whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-card',
                        m.role === 'user' ? 'rounded-tr-sm bg-brand-500 text-white' : 'rounded-tl-sm bg-white text-ink',
                      )}
                    >
                      {m.text}
                    </p>
                    {m.links && m.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.links.map((l) => (
                          <Link
                            key={l.to + l.label}
                            to={l.to}
                            onClick={() => setOpen(false)}
                            className="rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] font-semibold text-brand-600 transition hover:bg-brand-50"
                          >
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Suggested questions */}
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-3 pt-3">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-mut">
                <HelpCircle size={11} /> Suggested
              </span>
              {suggested.slice(0, 4).map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-navy-700 transition hover:bg-brand-50 hover:text-brand-600"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                ask(input)
              }}
              className="flex items-center gap-2 bg-white p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about rooms, rent, rules…"
                aria-label="Ask the assistant"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="submit"
                aria-label="Send question"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition hover:bg-brand-600"
              >
                <Send size={16} />
              </button>
            </form>
            <p className="flex items-center gap-1.5 bg-white px-4 pb-3 text-[10px] text-mut">
              <Sparkles size={10} /> Answers come from BoardEase FAQ content — not an AI recommendation engine.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
