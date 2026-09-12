import { motion } from 'framer-motion'
import { Building2, CheckCircle2, Eye, EyeOff, Lock, LogIn, Mail, Phone, User, UserPlus, Users } from 'lucide-react'
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

const DASHBOARD_FOR: Record<UserRole, string> = { landlord: '/dashboard', boarder: '/boarder' }

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [step, setStep] = useState<'role' | 'form' | 'signup'>('role')
  const [role, setRole] = useState<UserRole | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  // Sign-up fields
  const [name, setName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showSignupPw, setShowSignupPw] = useState(false)
  const [done, setDone] = useState(false)

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
    navigate(DASHBOARD_FOR[result.role ?? role])
  }

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!signupEmail.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (signupPassword.length < 6) {
      setError('Your password must be at least 6 characters.')
      return
    }
    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    const result = await register({
      name: name.trim(),
      email: signupEmail.trim(),
      password: signupPassword,
      phone: signupPhone.trim() || undefined,
    })
    if (!result.ok) {
      setError(result.error ?? 'Could not create your account')
      return
    }
    setDone(true)
    window.setTimeout(() => navigate(DASHBOARD_FOR[result.role ?? 'boarder']), 900)
  }

  const goToSignup = () => {
    setStep('signup')
    setError('')
    setEmail(signupEmail)
  }

  const goToSignIn = () => {
    setStep('form')
    setError('')
    // Carry the email across so the boarder doesn't retype it.
    if (signupEmail) setEmail(signupEmail)
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

  const isSignup = step === 'signup'

  const heading = isSignup ? 'Create your account' : step === 'role' ? 'Welcome to BoardEase' : 'Sign in'
  const subheading = isSignup
    ? 'Sign up as a boarder to browse, save and reserve boarding houses.'
    : step === 'role'
      ? 'Choose your role to get started.'
      : <>Logging in as <span className="font-semibold text-white capitalize">{role}</span></>

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
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">{heading}</h1>
          <p className="mt-2 text-sm text-navy-200/80">{subheading}</p>
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

              <p className="pt-1 text-center text-xs text-white/50">
                Don&apos;t have an account yet?{' '}
                <button onClick={goToSignup} className="font-semibold text-brand-300 transition hover:text-brand-200">
                  Sign up
                </button>
              </p>
            </div>
          )}

          {/* Step 2 — sign in form */}
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

          {/* Step 3 — sign up form */}
          {isSignup && (
            <div className="space-y-5">
              {done ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <motion.span
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-mint-400/20 text-mint-300"
                  >
                    <CheckCircle2 size={26} />
                  </motion.span>
                  <h4 className="mt-4 text-lg font-bold text-white">Account created!</h4>
                  <p className="mt-1 text-sm text-navy-200/80">Taking you to your boarder dashboard…</p>
                </div>
              ) : (
                <form onSubmit={handleSignup} className="space-y-5">
                  <button
                    type="button"
                    onClick={goToSignIn}
                    className="flex items-center gap-1 text-xs font-medium text-white/50 transition hover:text-white/80"
                  >
                    ← Back to sign in
                  </button>

                  <div>
                    <label htmlFor="signup-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-200">
                      Full name <span className="text-mint-300">*</span>
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                      <input
                        id="signup-name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jessa Marie Cabanero"
                        className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-navy-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-200">
                      Email <span className="text-mint-300">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                      <input
                        id="signup-email"
                        type="email"
                        required
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-navy-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-phone" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-200">
                      Contact number
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                      <input
                        id="signup-phone"
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value)}
                        placeholder="0917 000 0000"
                        className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-navy-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-200">
                      Password <span className="text-mint-300">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                      <input
                        id="signup-password"
                        type={showSignupPw ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-11 text-sm text-white placeholder-navy-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPw((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 transition hover:text-white"
                        tabIndex={-1}
                        aria-label={showSignupPw ? 'Hide password' : 'Show password'}
                      >
                        {showSignupPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-white/40">Required · minimum 6 characters</p>
                  </div>

                  <div>
                    <label htmlFor="signup-confirm" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-200">
                      Confirm password <span className="text-mint-300">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                      <input
                        id="signup-confirm"
                        type={showSignupPw ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-navy-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                      />
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-mint-500 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgb(51_199_165/0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-mint-400"
                  >
                    <UserPlus size={17} /> Create boarder account
                  </button>

                  <p className="text-center text-xs leading-relaxed text-white/40">
                    Boarding-house owners are onboarded by BoardEase administration.{' '}
                    <Link to="/" className="font-semibold text-brand-300 transition hover:text-brand-200">
                      Contact us
                    </Link>{' '}
                    to list your boarding house.
                  </p>
                </form>
              )}
            </div>
          )}
        </motion.div>

        {step === 'form' && (
          <p className="mt-6 text-center text-xs text-white/50">
            Don&apos;t have an account yet?{' '}
            <button onClick={goToSignup} className="font-semibold text-brand-300 transition hover:text-brand-200">
              Sign up
            </button>
          </p>
        )}

        {isSignup && !done && (
          <p className="mt-6 text-center text-xs text-white/50">
            Already have an account?{' '}
            <button onClick={goToSignIn} className="font-semibold text-brand-300 transition hover:text-brand-200">
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
