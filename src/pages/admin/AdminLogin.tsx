import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, LogIn, Mail, Shield, ArrowLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

const FADE = { duration: 0.32, ease: 'easeOut' } as const

export default function AdminLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await login(email, password, 'admin')
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? 'Login failed')
      return
    }
    navigate('/admin')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-900 px-4">
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-5">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-400 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-mint-400 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={FADE}
        className="relative z-10 w-full max-w-md"
      >
        {/* Back link */}
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-white/50 transition hover:text-white/80"
        >
          <ArrowLeft size={15} /> Back to sign in
        </Link>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-mint-400 shadow-lg">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Admin Console</h1>
          <p className="mt-2 text-sm text-navy-200/80">System administration access</p>
        </div>

        {/* Form card */}
        <div className="rounded-[22px] border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="admin-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-200">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@boardease.com"
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-navy-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-200">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                <input
                  id="admin-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-11 text-sm text-white placeholder-navy-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 transition hover:text-white"
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-red-500/15 px-3 py-2 text-center text-sm font-medium text-red-300"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgb(30_115_232/0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-400 hover:shadow-[0_12px_32px_rgb(30_115_232/0.55)] disabled:opacity-70"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <LogIn size={17} />
              )}
              {loading ? 'Signing in…' : 'Sign in as Admin'}
            </button>

            <p className="text-center text-xs text-white/40">
              Authorized personnel only.
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
