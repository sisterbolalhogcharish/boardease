import type { AIAnswer, AICard } from './types'
import {
  BOARDERS,
  PAYMENTS,
  ROOMS,
  houseById,
  paymentsThisMonth,
  revenueTrend,
} from './db'

const peso = (n: number) => `₱${n.toLocaleString('en-PH')}`

const SUGGESTIONS = [
  'Who hasn\'t paid?',
  'Which rooms are vacant?',
  'How much did I earn this month?',
  'Occupancy rate?',
  'Contracts expiring?',
  'Most profitable room?',
  'Female tenants?',
]

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */
const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w))

function boarderTable(ids: string[]): { columns: string[]; rows: (string | number)[][] } {
  const rows = ids.map((id) => {
    const b = BOARDERS.find((x) => x.id === id)!
    const room = ROOMS.find((r) => r.id === b.roomId)
    return [b.name, room?.roomNo ?? '—', b.gender === 'male' ? 'Male' : 'Female', b.school, peso(b.monthlyRent)]
  })
  return { columns: ['Boarder', 'Room', 'Gender', 'School', 'Monthly Rent'], rows }
}

function cardsFrom(rows: { label: string; value: string; hint?: string; tone?: AICard['tone'] }[]): AICard[] {
  return rows.map((r) => ({ label: r.label, value: r.value, hint: r.hint, tone: r.tone }))
}

/* ------------------------------------------------------------------ */
/*  Intent matchers                                                    */
/* ------------------------------------------------------------------ */
type Handler = (q: string) => AIAnswer | null

const handlers: Handler[] = [
  /* ---- Who hasn't paid / overdue ---- */
  (q) => {
    if (!has(q, 'overdue', 'unpaid', "hasn't paid", 'haven\'t paid', 'not paid', 'utang', 'wala pa', 'dili pa bayad')) return null
    const current = paymentsThisMonth()
    const overdue = current.filter((p) => p.status === 'overdue')
    const late = current.filter((p) => p.status === 'late')
    const target = overdue.length ? overdue : late
    const statusLabel = overdue.length ? 'Overdue' : 'Paid late'
    return {
      summary:
        overdue.length > 0
          ? `${overdue.length} boarder${overdue.length > 1 ? 's' : ''} ha${overdue.length > 1 ? 've' : 's'} an overdue payment this month (${peso(overdue.reduce((s, p) => s + p.amount, 0))}).`
          : `No overdue payments this month. ${late.length} boarder${late.length === 1 ? '' : 's'} paid late.`,
      type: 'table',
      columns: ['Boarder', 'Room', 'Amount', 'Due Date', 'Status'],
      rows: target.map((p) => {
        const b = BOARDERS.find((x) => x.id === p.boarderId)
        const r = ROOMS.find((x) => x.id === p.roomId)
        return [b?.name ?? '—', r?.roomNo ?? '—', peso(p.amount), p.dueDate, statusLabel]
      }),
      suggested: ['Who paid today?', 'Show overdue payments', 'How much is pending this month?'],
    }
  },

  /* ---- Who paid today ---- */
  (q) => {
    if (!has(q, 'paid today', 'pay today', 'bayad karong', 'paid this day')) return null
    const today = new Date().toISOString().slice(0, 10)
    const paid = PAYMENTS.filter((p) => p.paidDate === today)
    return {
      summary: paid.length
        ? `${paid.length} payment${paid.length > 1 ? 's' : ''} recorded today, totalling ${peso(paid.reduce((s, p) => s + p.amount, 0))}.`
        : 'No payments have been recorded today yet.',
      type: paid.length ? 'table' : 'text',
      columns: ['Boarder', 'Room', 'Amount', 'Method'],
      rows: paid.map((p) => {
        const b = BOARDERS.find((x) => x.id === p.boarderId)
        const r = ROOMS.find((x) => x.id === p.roomId)
        return [b?.name ?? '—', r?.roomNo ?? '—', peso(p.amount), p.method ?? '—']
      }),
      suggested: ['Who hasn\'t paid?', 'How much did I earn this month?'],
    }
  },

  /* ---- Vacant / available rooms ---- */
  (q) => {
    if (!has(q, 'vacant', 'available', 'empty', 'free room', 'free bed', 'bakante', 'wala tao')) return null
    const vacant = ROOMS.filter((r) => r.occupied < r.capacity)
    return {
      summary: `${vacant.length} room${vacant.length === 1 ? '' : 's'} currently have open bed${vacant.reduce((s, r) => s + (r.capacity - r.occupied), 0) === 1 ? '' : 's'} (${vacant.reduce((s, r) => s + (r.capacity - r.occupied), 0)} beds free).`,
      type: 'table',
      columns: ['Room', 'Type', 'Free Beds', 'Monthly Rent', 'Aircon'],
      rows: vacant.map((r) => [r.roomNo, r.type, `${r.capacity - r.occupied}`, peso(r.monthlyRent), r.aircon ? 'Yes' : 'No']),
      suggested: ['Occupancy rate?', 'Most profitable room?', 'List all rooms'],
    }
  },

  /* ---- Who lives in Room X ---- */
  (q) => {
    const m = q.match(/room\s*(\d{3})/)
    if (!m) return null
    const room = ROOMS.find((r) => r.roomNo === m[1])
    if (!room)
      return {
        summary: `I couldn't find room ${m[1]}. Registered rooms are: ${ROOMS.map((r) => r.roomNo).join(', ')}.`,
        type: 'text',
        suggested: SUGGESTIONS,
      }
    const occupants = BOARDERS.filter((b) => b.roomId === room.id)
    return {
      summary: occupants.length
        ? `Room ${room.roomNo} (${room.type}, ₱${room.monthlyRent.toLocaleString()}/mo) has ${occupants.length} of ${room.capacity} beds occupied.`
        : `Room ${room.roomNo} is currently vacant (${room.capacity} bed${room.capacity === 1 ? '' : 's'}, ₱${room.monthlyRent.toLocaleString()}/mo).`,
      type: occupants.length ? 'table' : 'text',
      columns: ['Boarder', 'Gender', 'School', 'Course', 'Move-in'],
      rows: occupants.map((b) => [b.name, b.gender === 'male' ? 'Male' : 'Female', b.school, b.course, b.moveInDate]),
      suggested: ['Which rooms are vacant?', 'Who hasn\'t paid?'],
    }
  },

  /* ---- Average monthly income ---- */
  (q) => {
    if (!has(q, 'average')) return null
    const trend = revenueTrend()
    const vals = trend.map((t) => t.income)
    const avg = vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length)
    const last = vals[vals.length - 1] ?? 0
    const delta = last - avg
    return {
      summary: `Your average monthly income over the last ${vals.length} months is ${peso(Math.round(avg))}.`,
      type: 'cards',
      cards: cardsFrom([
        { label: 'Average / month', value: peso(Math.round(avg)), tone: 'blue' },
        { label: 'This month', value: peso(last), hint: delta >= 0 ? `▲ ${peso(Math.round(delta))} vs average` : `▼ ${peso(Math.round(-delta))} vs average`, tone: delta >= 0 ? 'green' : 'orange' },
      ]),
      suggested: ['How much did I earn this month?', 'Revenue forecast', 'Most profitable room?'],
    }
  },

  /* ---- Income this month ---- */
  (q) => {
    if (!has(q, 'income', 'earn', 'earned', 'revenue', 'kita', 'how much did i')) return null
    const current = paymentsThisMonth()
    const collected = current.filter((p) => p.status === 'paid' || p.status === 'late').reduce((s, p) => s + p.amount, 0)
    const pending = current.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
    const overdue = current.filter((p) => p.status === 'overdue').reduce((s, p) => s + p.amount, 0)
    const expected = current.reduce((s, p) => s + p.amount, 0)
    const trend = revenueTrend()
    return {
      summary: `This month you collected ${peso(collected)} out of ${peso(expected)} expected rent.`,
      type: 'cards',
      cards: cardsFrom([
        { label: 'Collected', value: peso(collected), hint: 'paid + late', tone: 'green' },
        { label: 'Pending', value: peso(pending), hint: `${current.filter((p) => p.status === 'pending').length} boarders`, tone: 'orange' },
        { label: 'Overdue', value: peso(overdue), hint: `${current.filter((p) => p.status === 'overdue').length} boarders`, tone: 'red' },
        { label: 'Expected', value: peso(expected), hint: 'total monthly rent', tone: 'navy' },
      ]),
      chart: {
        kind: 'bar',
        title: 'Monthly income trend',
        data: trend.map((t) => ({ name: t.name.slice(5), value: t.income })),
      },
      suggested: ['Who hasn\'t paid?', 'Average monthly income?', 'Revenue forecast'],
    }
  },

  /* ---- Occupancy rate ---- */
  (q) => {
    if (!has(q, 'occupancy', 'puno', 'occupancy rate', 'full')) return null
    const occupied = ROOMS.reduce((s, r) => s + r.occupied, 0)
    const total = ROOMS.reduce((s, r) => s + r.capacity, 0)
    const pct = Math.round((occupied / total) * 100)
    return {
      summary: `Overall occupancy is ${pct}% — ${occupied} of ${total} beds are taken.`,
      type: 'mixed',
      cards: cardsFrom([
        { label: 'Occupancy', value: `${pct}%`, hint: `${occupied} / ${total} beds`, tone: 'blue' },
        { label: 'Vacant beds', value: `${total - occupied}`, hint: `${ROOMS.filter((r) => r.occupied < r.capacity).length} rooms with space`, tone: 'green' },
        { label: 'Full rooms', value: `${ROOMS.filter((r) => r.occupied >= r.capacity).length}`, tone: 'orange' },
      ]),
      chart: {
        kind: 'line',
        title: 'Occupancy trend (6 months)',
        data: [
          { name: 'Mar', value: 68 },
          { name: 'Apr', value: 71 },
          { name: 'May', value: 74 },
          { name: 'Jun', value: 78 },
          { name: 'Jul', value: 81 },
          { name: 'Aug', value: pct },
        ],
      },
      suggested: ['Which rooms are vacant?', 'Revenue forecast', 'Boarder growth'],
    }
  },

  /* ---- Expiring contracts ---- */
  (q) => {
    if (!has(q, 'expir', 'kontrata', 'contract end', 'matapos', 'renew')) return null
    const soon = BOARDERS.filter((b) => {
      const end = new Date(b.contractEnd).getTime()
      const days = (end - Date.now()) / 86400000
      return b.status === 'expiring' || (days >= 0 && days <= 45)
    })
    return {
      summary: soon.length
        ? `${soon.length} contract${soon.length === 1 ? '' : 's'} expire within the next 45 days.`
        : 'No contracts are expiring in the next 45 days.',
      type: 'table',
      columns: ['Boarder', 'Room', 'Contract Ends', 'Status'],
      rows: soon.map((b) => {
        const r = ROOMS.find((x) => x.id === b.roomId)
        return [b.name, r?.roomNo ?? '—', b.contractEnd, b.status === 'expiring' ? 'Expiring' : 'Active']
      }),
      suggested: ['Who hasn\'t paid?', 'Who are my boarders?', 'Female tenants?'],
    }
  },

  /* ---- Female / male tenants ---- */
  (q) => {
    const isFemale = has(q, 'female', 'babae', 'girls', 'women')
    const isMale = has(q, 'male', 'lalaki', 'boys', 'men')
    if (!isFemale && !isMale) return null
    const gender = isFemale ? 'female' : 'male'
    const list = BOARDERS.filter((b) => b.gender === gender)
    const label = isFemale ? 'female' : 'male'
    return {
      summary: `You have ${list.length} ${label} boarder${list.length === 1 ? '' : 's'} (${Math.round((list.length / BOARDERS.length) * 100)}% of all boarders).`,
      type: 'table',
      columns: ['Boarder', 'Room', 'School', 'Monthly Rent'],
      rows: list.map((b) => {
        const r = ROOMS.find((x) => x.id === b.roomId)
        return [b.name, r?.roomNo ?? '—', b.school, peso(b.monthlyRent)]
      }),
      suggested: ['Gender distribution?', 'Who hasn\'t paid?', 'Which rooms are vacant?'],
    }
  },

  /* ---- Gender distribution ---- */
  (q) => {
    if (!has(q, 'gender', 'distribution', 'split', 'breakdown')) return null
    const male = BOARDERS.filter((b) => b.gender === 'male').length
    const female = BOARDERS.filter((b) => b.gender === 'female').length
    return {
      summary: `Boarder gender split — ${female} female, ${male} male.`,
      type: 'chart',
      chart: {
        kind: 'pie',
        title: 'Boarders by gender',
        data: [
          { name: 'Female', value: female },
          { name: 'Male', value: male },
        ],
      },
      suggested: ['Female tenants?', 'School distribution?', 'Who are my boarders?'],
    }
  },

  /* ---- Most profitable room ---- */
  (q) => {
    if (!has(q, 'profitable', 'profit', 'best room', 'top room', 'highest', 'dako')) return null
    const ranked = ROOMS.map((r) => ({ ...r, potential: r.monthlyRent * r.occupied }))
      .sort((a, b) => b.potential - a.potential)
      .slice(0, 5)
    return {
      summary: `Your most profitable room is ${ranked[0].roomNo} (${ranked[0].type}) generating ${peso(ranked[0].potential)}/month at ${ranked[0].occupied}/${ranked[0].capacity} occupancy.`,
      type: 'chart',
      chart: {
        kind: 'bar',
        title: 'Rooms by potential revenue',
        data: ranked.map((r) => ({ name: r.roomNo, value: r.potential })),
      },
      suggested: ['Average monthly income?', 'Which rooms are vacant?', 'Revenue forecast'],
    }
  },

  /* ---- How many boarders ---- */
  (q) => {
    if (!has(q, 'how many', 'pila', 'count', 'number of')) return null
    const male = BOARDERS.filter((b) => b.gender === 'male').length
    const female = BOARDERS.filter((b) => b.gender === 'female').length
    return {
      summary: `You currently manage ${BOARDERS.length} boarders across ${ROOMS.length} rooms.`,
      type: 'cards',
      cards: cardsFrom([
        { label: 'Total boarders', value: `${BOARDERS.length}`, tone: 'navy' },
        { label: 'Female', value: `${female}`, tone: 'blue' },
        { label: 'Male', value: `${male}`, tone: 'green' },
        { label: 'Active rooms', value: `${ROOMS.filter((r) => r.occupied > 0).length}`, tone: 'orange' },
      ]),
      suggested: ['Who are my boarders?', 'Gender distribution?', 'School distribution?'],
    }
  },

  /* ---- Boarders list ---- */
  (q) => {
    if (!has(q, 'boarder', 'tenant', 'kabu', 'boarders')) return null
    const t = boarderTable(BOARDERS.map((b) => b.id))
    return {
      summary: `Here are all ${BOARDERS.length} active boarders.`,
      type: 'table',
      columns: t.columns,
      rows: t.rows,
      suggested: ['Female tenants?', 'Contracts expiring?', 'Who hasn\'t paid?'],
    }
  },

  /* ---- List rooms ---- */
  (q) => {
    if (!has(q, 'rooms', 'list room', 'show room')) return null
    return {
      summary: `Here are all ${ROOMS.length} rooms at Sunset Boarding House.`,
      type: 'table',
      columns: ['Room', 'Type', 'Occupied', 'Capacity', 'Rent', 'Aircon'],
      rows: ROOMS.map((r) => [r.roomNo, r.type, `${r.occupied}/${r.capacity}`, `${r.capacity}`, peso(r.monthlyRent), r.aircon ? 'Yes' : 'No']),
      suggested: ['Which rooms are vacant?', 'Most profitable room?', 'Occupancy rate?'],
    }
  },

  /* ---- Payments this month / summary ---- */
  (q) => {
    if (!has(q, 'payment', 'bayad')) return null
    const current = paymentsThisMonth()
    const paid = current.filter((p) => p.status === 'paid' || p.status === 'late').length
    const pending = current.filter((p) => p.status === 'pending').length
    const overdue = current.filter((p) => p.status === 'overdue').length
    return {
      summary: `${paid} paid, ${pending} pending and ${overdue} overdue this month (${current.length} records).`,
      type: 'cards',
      cards: cardsFrom([
        { label: 'Paid', value: `${paid}`, tone: 'green' },
        { label: 'Pending', value: `${pending}`, tone: 'orange' },
        { label: 'Overdue', value: `${overdue}`, tone: 'red' },
        { label: 'Total', value: `${current.length}`, tone: 'navy' },
      ]),
      suggested: ['Who hasn\'t paid?', 'How much did I earn this month?', 'Who paid today?'],
    }
  },

  /* ---- School distribution ---- */
  (q) => {
    if (!has(q, 'school', 'eskwela', 'course')) return null
    const counts = new Map<string, number>()
    BOARDERS.forEach((b) => counts.set(b.school, (counts.get(b.school) ?? 0) + 1))
    const data = Array.from(counts.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    return {
      summary: 'Here is how your boarders are distributed across schools.',
      type: 'chart',
      chart: { kind: 'bar', title: 'Boarders by school', data },
      suggested: ['Gender distribution?', 'Who are my boarders?', 'How many boarders?'],
    }
  },

  /* ---- Trend / forecast ---- */
  (q) => {
    if (!has(q, 'trend', 'forecast', 'projection', 'next month', 'growth')) return null
    const trend = revenueTrend()
    const vals = trend.map((t) => t.income)
    const avg = vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length)
    const forecast = Array.from({ length: 6 }, (_, i) => ({
      name: `F${i + 1}`,
      value: Math.round(avg * (1 + 0.02 * i)),
    }))
    return {
      summary: `Based on your last ${vals.length} months (avg ${peso(Math.round(avg))}/mo), projected income grows ~2% monthly.`,
      type: 'chart',
      chart: { kind: 'area', title: 'Revenue forecast (next 6 months)', data: forecast },
      suggested: ['How much did I earn this month?', 'Average monthly income?', 'Most profitable room?'],
    }
  },

  /* ---- Greeting / help ---- */
  (q) => {
    if (!has(q, 'hi', 'hello', 'hey', 'help', 'salamat', 'maayong', 'what can you do', 'unsa')) return null
    return {
      summary:
        'Hi! I\'m your BoardEase AI assistant. I can answer questions using only your boarding house data — payments, rooms, boarders, contracts, and analytics. Try asking:',
      type: 'text',
      suggested: SUGGESTIONS,
    }
  },
]

/* ------------------------------------------------------------------ */
/*  Public entry point                                                 */
/* ------------------------------------------------------------------ */
export function askAI(question: string): AIAnswer {
  const q = question.toLowerCase().trim()
  for (const handler of handlers) {
    const answer = handler(q)
    if (answer) return answer
  }
  const house = houseById('sunset')
  return {
    summary:
      `I can only answer from your boarding house data${house ? ` (${house.name})` : ''}. I found ${BOARDERS.length} boarders, ${ROOMS.length} rooms and ${PAYMENTS.length} payment records. Try one of these:`,
    type: 'text',
    suggested: SUGGESTIONS,
  }
}

export const AI_SUGGESTIONS = SUGGESTIONS
