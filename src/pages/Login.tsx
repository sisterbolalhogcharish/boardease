import { motion } from 'framer-motion'
import { Building2, Eye, EyeOff, Lock, LogIn, Mail, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth, type UserRole } from '../lib/auth'
import { cn } from '../lib/utils'

const ROLE_CARDS: { role: UserRole; icon: typeof Building2; title: string; desc: string; color: string }[] = [
  {
    role: 'landlord',
    icon: Building2,
    title: 'I am a Landlord',
    desc: 'Manage my boarding house, rooms, payments & analytics.',
    color: 'border-brand-200 bg-brand-50/60 hover:border-brand-400 hover:bg-brand-50',
  },
  {
    role: 'boarder',
    icon: Users,
    title: 'I am a Boarder',
    desc: 'Find a room, track my payments & leave reviews.',
    color: 'border-mint-200 bg-mint-50/60 hover:border-mint-400 hover:bg-mint-50',
  },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Pricing CTAs deep-link with ?role=landlord so the landlord flow is preselected.
  const requestedRole = searchParams.get('role')
  const presetRole: UserRole | null =
    requestedRole === 'landlord' || requestedRole === 'boarder' ? requestedRole : null

  const [step, setStep] = useState<'role' | 'form'>(presetRole ? 'form' : 'role')
  const [role, setRole] = useState<UserRole | null>(presetRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  const handleRoleSelect = (r: UserRole) => {
    setRole(r)
    setStep('form')
    setError('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!role) return
    const result = await login(email, password)
    if (!result.ok) {
      setError(result.error ?? 'Login failed')
      return
    }
    navigate(role === 'landlord' ? '/dashboard' : '/boarder')
  }

  const demoLogin = (r: UserRole) => {
    const cred = r === 'landlord'
      ? { email: 'landlord@gmail.com', password: 'landlord123' }
      : { email: 'boarder@gmail.com', password: 'boarder123' }
    setRole(r)
    setEmail(cred.email)
    setPassword(cred.password)
    setStep('form')
    setError('')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-navy-950 via-navy-800 to-brand-700 px-4 py-12">
      {/* Background decorations */}
      <div className="hero-grid-bg absolute inset-0" />
      <div className="hero-blob -top-20 left-1/4 h-96 w-96 bg-brand-500" />
      <div className="hero-blob right-10 top-40 h-80 w-80 bg-mint-400" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / back */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-white/60 text-sm font-medium transition hover:text-white/90">
            ← Back to BoardEase
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
            {step === 'role' ? 'Welcome to BoardEase' : 'Sign in'}
          </h1>
          <p className="mt-2 text-sm text-navy-200/80">
            {step === 'role'
              ? 'Choose your role to get started.'
              : <>Logging in as <span className="font-semibold text-white capitalize">{role}</span></>}
          </p>
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="rounded-[22px] border border-white/10 bg-white/5 p-6 shadow-float backdrop-blur-xl sm:p-8"
        >
          {/* Step 1 — role picker */}
          {step === 'role' && (
            <div className="space-y-4">
              {ROLE_CARDS.map((rc) => (
                <button
                  key={rc.role}
                  onClick={() => handleRoleSelect(rc.role)}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-200',
                    'border-white/10 bg-white/5 hover:border-brand-400/60 hover:bg-white/10',
                  )}
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-mint-400 text-white shadow-lg">
                    <rc.icon size={24} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-white">{rc.title}</p>
                    <p className="mt-0.5 text-sm text-navy-200/80">{rc.desc}</p>
                  </div>
                </button>
              ))}

              <div className="pt-4 border-t border-white/10">
                <p className="mb-3 text-center text-xs font-medium text-white/50">Or try a demo account</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => demoLogin('landlord')}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    <Building2 size={14} className="mr-1.5 inline" />
                    Landlord demo
                  </button>
                  <button
                    onClick={() => demoLogin('boarder')}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    <Users size={14} className="mr-1.5 inline" />
                    Boarder demo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — login form */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <button
                type="button"
                onClick={() => { setStep('role'); setError('') }}
                className="flex items-center gap-1 text-xs font-medium text-white/50 transition hover:text-white/80"
              >
                ← Change role
              </button>

              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-200">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-navy-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-200">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                  <input
                    id="password"
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgb(30_115_232/0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-400 hover:shadow-[0_12px_32px_rgb(30_115_232/0.55)]"
              >
                <LogIn size={17} /> Sign in
              </button>

              <p className="text-center text-xs text-white/40">
                {role === 'landlord' ? (
                  <>Demo: <span className="font-mono text-white/60">landlord@gmail.com</span> / <span className="font-mono text-white/60">landlord123</span></>
                ) : (
                  <>Demo: <span className="font-mono text-white/60">boarder@gmail.com</span> / <span className="font-mono text-white/60">boarder123</span></>
                )}
              </p>
            </form>
          )}
        </motion.div>

        <p className="mt-6 text-center text-xs text-white/40">
          Don't have an account?{' '}
          <Link to="/" className="font-semibold text-brand-300 transition hover:text-brand-200">
            Contact us
          </Link>
        </p>
      </div>
    </div>
  )
}
