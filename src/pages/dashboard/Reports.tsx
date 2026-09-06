import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import { useState } from 'react'
import { PaymentBadge, Skeleton } from '../../components/ui'
import { useBoarders, useDashboard, usePaymentMonths, usePayments } from '../../lib/hooks'
import { peso, prettyDate } from '../../lib/utils'

function downloadCSV(filename: string, rows: (string | number)[][], headers: string[]) {
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const { data: dashboard } = useDashboard()
  const { data: boarders } = useBoarders()
  const { data: months } = usePaymentMonths()
  const [month, setMonth] = useState<string | undefined>(undefined)
  const { data: payments, isLoading } = usePayments({ month })

  const currentLabel = month ? new Date(month + '-02T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'All time'
  const collected = payments?.filter((p) => p.status === 'paid' || p.status === 'late').reduce((s, p) => s + p.amount, 0) ?? 0
  const outstanding = payments?.filter((p) => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + p.amount, 0) ?? 0

  const exportPayments = () =>
    downloadCSV(
      `boardease-payments-${month ?? 'all'}.csv`,
      (payments ?? []).map((p) => [p.boarderName, p.roomNo, p.label, p.amount, p.dueDate, p.paidDate ?? '', p.method ?? '', p.status, p.reference ?? '']),
      ['Boarder', 'Room', 'Period', 'Amount (PHP)', 'Due date', 'Paid date', 'Method', 'Status', 'Reference'],
    )

  const exportBoarders = () =>
    downloadCSV(
      'boardease-boarders.csv',
      (boarders ?? []).map((b) => [b.name, b.age, b.gender, b.school, b.course, b.phone, b.guardian, b.roomId, b.monthlyRent, b.moveInDate, b.contractEnd]),
      ['Name', 'Age', 'Gender', 'School', 'Course', 'Phone', 'Guardian', 'Room', 'Rent (PHP)', 'Move-in', 'Contract end'],
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-navy-800">Reports & exports</h2>
          <p className="text-sm text-ink">Generate summaries and export your data for accounting or records.</p>
        </div>
        <select
          value={month ?? ''}
          onChange={(e) => setMonth(e.target.value || undefined)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-navy-800 outline-none transition focus:border-brand-400"
        >
          <option value="">All months</option>
          {months?.map((m) => (
            <option key={m} value={m}>
              {new Date(m + '-02T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>
      </div>

      {/* Export cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: FileText, title: 'Payment report (PDF)', desc: 'Print-ready summary of the selected period.', onClick: () => window.print(), accent: 'bg-brand-50 text-brand-500' },
          { icon: FileSpreadsheet, title: 'Payments (Excel)', desc: 'CSV export compatible with Excel & Google Sheets.', onClick: exportPayments, accent: 'bg-mint-50 text-mint-600' },
          { icon: FileSpreadsheet, title: 'Boarder list (Excel)', desc: 'All boarder records with contact & contract info.', onClick: exportBoarders, accent: 'bg-navy-50 text-navy-800' },
        ].map((c) => (
          <button
            key={c.title}
            onClick={c.onClick}
            className="group flex flex-col items-start gap-3 rounded-[18px] border border-slate-100 bg-white p-5 text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${c.accent}`}>
              <c.icon size={20} />
            </span>
            <div>
              <p className="font-bold text-navy-800">{c.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink">{c.desc}</p>
            </div>
            <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-brand-500 opacity-0 transition group-hover:opacity-100">
              <Download size={13} /> Download
            </span>
          </button>
        ))}
      </div>

      {/* Report preview */}
      <div className="rounded-[18px] border border-slate-100 bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-navy-800">Report preview — {currentLabel}</h3>
            <p className="text-xs text-mut">Sunset Boarding House · San Juan, Siquijor</p>
          </div>
          <button onClick={exportPayments} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-navy-800 transition hover:border-brand-300 hover:text-brand-500">
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
        <div className="grid gap-4 border-b border-slate-100 px-5 py-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-mut">Collected</p>
            <p className="mt-0.5 text-xl font-extrabold text-mint-600">{peso(collected)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-mut">Outstanding</p>
            <p className="mt-0.5 text-xl font-extrabold text-danger">{peso(outstanding)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-mut">Occupancy</p>
            <p className="mt-0.5 text-xl font-extrabold text-navy-800">{dashboard?.occupancyRate ?? 0}%</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-mut">Active boarders</p>
            <p className="mt-0.5 text-xl font-extrabold text-navy-800">{dashboard?.boarderCount ?? 0}</p>
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="m-5 h-64 rounded-xl" />
        ) : payments && payments.length > 0 ? (
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-xs uppercase tracking-wider text-mut">
                  <th className="px-5 py-3 font-semibold">Boarder</th>
                  <th className="px-5 py-3 font-semibold">Period</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Paid date</th>
                  <th className="px-5 py-3 font-semibold">Method</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-50">
                    <td className="px-5 py-3 font-semibold text-navy-800">{p.boarderName}</td>
                    <td className="px-5 py-3 text-ink">{p.label}</td>
                    <td className="px-5 py-3 font-semibold text-navy-800">{peso(p.amount)}</td>
                    <td className="px-5 py-3 text-ink">{p.paidDate ? prettyDate(p.paidDate) : '—'}</td>
                    <td className="px-5 py-3 text-ink">{p.method ?? '—'}</td>
                    <td className="px-5 py-3">
                      <PaymentBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-ink">No payment records for this period.</p>
        )}
      </div>
    </div>
  )
}
