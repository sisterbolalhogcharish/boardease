import type { Payment, PaymentStatus } from '../types'
import { BOARDERS } from './people'

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */
export const NOW = new Date()

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Deterministic pseudo-random so data is stable between reloads. */
function rnd(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/* ------------------------------------------------------------------ */
/*  Payment history                                                    */
/* ------------------------------------------------------------------ */
const METHODS = ['GCash', 'Cash', 'Bank Transfer', 'PayLink'] as const

/** Boarders with special payment behaviour (keeps the data story-rich). */
const alwaysLate: Record<string, boolean> = { b8: true }
const overdueNow: Record<string, boolean> = { b7: true, b17: true }
const paidEarly: Record<string, boolean> = { b1: true, b5: true, b9: true, b13: true, b20: true }

export function generatePayments(): Payment[] {
  const payments: Payment[] = []
  let seq = 0

  // Build the last 8 month buckets, oldest first.
  const months: Date[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1)
    months.push(d)
  }

  for (const boarder of BOARDERS) {
    const moveIn = new Date(boarder.moveInDate)

    months.forEach((monthStart, idx) => {
      // Skip months before the boarder moved in.
      if (moveIn > monthStart) return

      const isCurrent = idx === months.length - 1
      const due = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1)

      let status: PaymentStatus
      let paidDate: string | null = null

      if (isCurrent) {
        if (overdueNow[boarder.id]) status = 'overdue'
        else if (paidEarly[boarder.id]) {
          status = 'paid'
          paidDate = toISO(new Date(due.getFullYear(), due.getMonth(), 1 + Math.floor(rnd(boarder.id.length + idx) * 3) + 1))
        } else status = 'pending'
      } else if (alwaysLate[boarder.id]) {
        status = 'late'
        paidDate = toISO(new Date(due.getFullYear(), due.getMonth(), 6 + Math.floor(rnd(boarder.id.length * 3 + idx) * 6)))
      } else if (overdueNow[boarder.id] && idx >= months.length - 3) {
        status = idx === months.length - 3 ? 'late' : 'overdue'
        if (idx === months.length - 3) {
          paidDate = toISO(new Date(due.getFullYear(), due.getMonth(), 8 + Math.floor(rnd(idx + 1) * 5)))
        }
      } else {
        status = 'paid'
        const day = 1 + Math.floor(rnd(boarder.id.length + idx * 7) * 4)
        paidDate = toISO(new Date(due.getFullYear(), due.getMonth(), day))
      }

      const method = status === 'paid' || status === 'late' ? METHODS[Math.floor(rnd(seq) * METHODS.length)] : null
      const reference =
        method === 'GCash'
          ? `GC-${Math.floor(100000 + rnd(seq + 1) * 899999)}`
          : method === 'PayLink'
            ? `PL-${Math.floor(100000 + rnd(seq + 2) * 899999)}`
            : method
              ? `RC-${Math.floor(10000 + rnd(seq + 3) * 89999)}`
              : null

      payments.push({
        id: `p-${seq++}`,
        boarderId: boarder.id,
        roomId: boarder.roomId,
        houseId: boarder.houseId,
        month: monthKey(monthStart),
        label: monthLabel(monthStart),
        amount: boarder.monthlyRent,
        dueDate: toISO(due),
        paidDate,
        status,
        method,
        reference,
      })
    })
  }

  return payments
}

export const PAYMENTS: Payment[] = generatePayments()
