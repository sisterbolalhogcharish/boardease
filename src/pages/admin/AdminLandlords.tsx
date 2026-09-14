import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Mail, Phone, Search, Shield, XCircle } from 'lucide-react'
import { Avatar, EmptyState } from '../../components/ui'
import { useQuery } from '@tanstack/react-query'
import { PLAN_INFO, type PlanName } from '../../lib/planFeatures'

async function fetchLandlords() {
  const res = await fetch('/api/admin/landlords')
  if (!res.ok) return []
  return res.json()
}

export default function AdminLandlords() {
  const [search, setSearch] = useState('')
  const { data: landlords, isLoading } = useQuery({ queryKey: ['admin-landlords'], queryFn: fetchLandlords })

  const filtered = (landlords ?? []).filter((l: any) =>
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase()) ||
    l.businessName?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search landlords by name, email, or property…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {/* Landlord list */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-[18px] bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users size={24} />} title="No landlords found" subtitle="There are no landlords registered yet." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l: any, i: number) => {
            const planKey = (l.subscription ?? 'none').toLowerCase() as PlanName
            const planInfo = PLAN_INFO[planKey]
            return (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={l.name} color={l.avatarColor ?? '#1E73E8'} className="h-11 w-11 text-sm" rounded="xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-navy-800">{l.name}</p>
                    <p className="truncate text-xs text-ink">{l.email}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', planInfo.bgClass)}>
                    {planInfo.label}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  {l.businessName && (
                    <p className="flex items-center gap-1.5 text-xs text-ink">
                      <Building2 size={12} className="text-mut" /> {l.businessName}
                    </p>
                  )}
                  {l.phone && (
                    <p className="flex items-center gap-1.5 text-xs text-ink">
                      <Phone size={12} className="text-mut" /> {l.phone}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-xs text-ink">
                    <Mail size={12} className="text-mut" /> {l.email}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                  {l.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2 py-0.5 text-[10px] font-bold text-mint-600">
                      <Shield size={10} /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                      <XCircle size={10} /> Unverified
                    </span>
                  )}
                  <span className="text-[10px] text-mut">Joined {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '—'}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { Users } from 'lucide-react'
import { cn } from '../../lib/utils'
