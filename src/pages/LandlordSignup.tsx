import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  Lock,
  MapPin,
  Phone,
  Shield,
  Upload,
  User,
  X,
} from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { registerLandlordAPI } from '../lib/api'
import { cn } from '../lib/utils'

const IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png'
const MAX_IMAGE_BYTES = 4 * 1024 * 1024

type UploadFile = { name: string; url: string }

function isAllowedImage(file: File) {
  const type = file.type.toLowerCase()
  const byMime = type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png'
  const byExt = /\.(jpe?g|png)$/i.test(file.name)
  return byMime || byExt
}

function readImageFile(file: File): Promise<UploadFile> {
  return new Promise((resolve, reject) => {
    if (!isAllowedImage(file)) {
      reject(new Error('Please upload a JPG, JPEG, or PNG image.'))
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error('Each file must be 4 MB or smaller.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve({ name: file.name, url: String(reader.result || '') })
    reader.onerror = () => reject(new Error('Could not read that file. Please try another image.'))
    reader.readAsDataURL(file)
  })
}

const LOCATION_DEFAULTS = {
  address: 'Maite National Road, San Juan, Siquijor',
  lat: 9.1644,
  lng: 123.4962,
}

type Step = 'form' | 'location' | 'documents' | 'done'

export default function LandlordSignup() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const validIdInputRef = useRef<HTMLInputElement>(null)
  const documentsInputRef = useRef<HTMLInputElement>(null)
  const mapCanvasRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const [step, setStep] = useState<Step>('form')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  // Location state
  const [locationAddress, setLocationAddress] = useState(LOCATION_DEFAULTS.address)
  const [locationLat, setLocationLat] = useState(LOCATION_DEFAULTS.lat)
  const [locationLng, setLocationLng] = useState(LOCATION_DEFAULTS.lng)
  const [locationSaved, setLocationSaved] = useState(false)

  const [validId, setValidId] = useState<UploadFile | null>(null)
  const [legalDocuments, setLegalDocuments] = useState<UploadFile | null>(null)

  const handleImageUpload = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (file: UploadFile) => void,
  ) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const uploaded = await readImageFile(file)
      setter(uploaded)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please upload a valid image file.')
    }
  }, [])

  // --- Map ---

  const updateLocation = useCallback((clientX: number, clientY: number) => {
    if (!mapCanvasRef.current) return
    const rect = mapCanvasRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const pctX = Math.max(0, Math.min(1, x / rect.width))
    const pctY = Math.max(0, Math.min(1, y / rect.height))
    const newLat = 9.0 + pctY * 0.3
    const newLng = 123.4 + pctX * 0.3
    setLocationLat(newLat)
    setLocationLng(newLng)
    setLocationAddress('Approximate location near San Juan, Siquijor')
    setLocationSaved(true)
    setError('')
  }, [])

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    updateLocation(e.clientX, e.clientY)
  }, [updateLocation])

  const handleMapMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return
    updateLocation(e.clientX, e.clientY)
  }, [dragging, updateLocation])

  const handleMapMouseDown = useCallback(() => { setDragging(true) }, [])
  const handleMapMouseUp = useCallback(() => { setDragging(false) }, [])
  const handleMapMouseLeave = useCallback(() => { setDragging(false) }, [])

  const confirmLocation = useCallback(() => {
    if (!locationSaved) {
      setError('Please click on the map to select your location.')
      return
    }
    setStep('documents')
    setError('')
  }, [locationSaved])

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLat(pos.coords.latitude)
        setLocationLng(pos.coords.longitude)
        setLocationAddress('Current location detected')
        setLocationSaved(true)
        setError('')
      },
      () => {
        setError('Unable to retrieve your location. Please click on the map instead.')
      }
    )
  }, [])

  // --- Step 1 validation (form -> location) ---

  const validateStep1 = (): boolean => {
    if (!fullName.trim()) {
      setError('Please enter your full name.')
      return false
    }
    if (!email.trim()) {
      setError('Please enter your email address.')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return false
    }
    if (!mobileNumber.trim() || String(mobileNumber).trim().length < 7) {
      setError('Please enter a valid mobile number.')
      return false
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return false
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return false
    }
    setError('')
    return true
  }

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateStep1()) {
      setStep('location')
    }
  }

  // --- Final submission (documents -> create account) ---

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (!validId?.url) {
      setError('Valid ID is required. Please upload a JPG, JPEG, or PNG image of a government-issued ID.')
      return
    }
    if (!legalDocuments?.url) {
      setError('Documents are required. Please upload a JPG, JPEG, or PNG image of your legal or business documents.')
      return
    }
    setError('')
    setSubmitting(true)

    try {
      await registerLandlordAPI({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        locationPref: locationAddress,
        locationLat,
        locationLng,
        documents: [
          { docType: 'valid_id', docName: validId.name || 'Valid ID', docUrl: validId.url },
          { docType: 'legal_documents', docName: legalDocuments.name || 'Documents', docUrl: legalDocuments.url },
        ],
      })
    } catch (err) {
      setSubmitting(false)
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
      return
    }

    setSubmitting(false)

    const authResult = await login(email.trim(), password)
    if (!authResult.ok) {
      setError('Account created, but sign-in failed. Please sign in manually.')
      return
    }

    setStep('done')
    window.setTimeout(() => navigate('/dashboard'), 1200)
  }

  const goBack = useCallback(() => {
    if (step === 'location') setStep('form')
    else if (step === 'documents') setStep('location')
    else setStep('form')
    setError('')
  }, [step])

  const markerLeft = ((locationLng - 123.4) / 0.3) * 100
  const markerTop = ((locationLat - 9.0) / 0.3) * 100

  const stepIndex = (s: Step): number => {
    switch (s) {
      case 'form': return 0
      case 'location': return 1
      case 'documents': return 2
      case 'done': return 3
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-navy-950 via-navy-800 to-brand-700 px-4 py-12">
      {/* Background decorations */}
      <div className="hero-grid-bg absolute inset-0" />
      <div className="hero-blob -top-20 left-1/4 h-96 w-96 bg-brand-500" />
      <div className="hero-blob right-10 top-40 h-80 w-80 bg-mint-400" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2 text-white/60 text-sm font-medium transition hover:text-white/90">
            ← Back to BoardEase
          </a>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
            Sign up as Landlord
          </h1>
          <p className="mt-2 text-sm text-navy-200/80">
            List your boarding house and manage boarders.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-[22px] border border-white/10 bg-white/5 p-6 shadow-float backdrop-blur-xl sm:p-8">
          {/* ===== STEP 1: FORM ===== */}
          {step === 'form' && (
            <form onSubmit={handleStep1Submit} className="space-y-5">
              <button type="button" onClick={goBack} className="flex items-center gap-1 text-xs font-medium text-white/50 transition hover:text-white/80">
                ← Back to sign in
              </button>

              {/* Full Name */}
              <div>
                <label htmlFor="full-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-200">
                  Full name <span className="text-mint-300">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                  <input
                    id="full-name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Rosario Cabasan"
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-navy-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="landlord-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-200">
                  Email <span className="text-mint-300">*</span>
                </label>
                <div className="relative">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300">
                    <rect x="3" y="5" width="18" height="14" rx="2"/>
                    <polyline points="3 7 12 13 21 7"/>
                  </svg>
                  <input
                    id="landlord-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-navy-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label htmlFor="mobile" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-200">
                  Mobile number <span className="text-mint-300">*</span>
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                  <input
                    id="mobile"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="0917 555 0100"
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-navy-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                  />
                </div>
                <p className="mt-1 text-[11px] text-white/40">Used for verification and account recovery.</p>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="landlord-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-200">
                  Password <span className="text-mint-300">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                  <input
                    id="landlord-password"
                    type={showPw ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-11 text-sm text-white placeholder-navy-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 transition hover:text-white"
                    tabIndex={-1}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-white/40">Required · minimum 6 characters</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="landlord-confirm" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-200">
                  Confirm password <span className="text-mint-300">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                  <input
                    id="landlord-confirm"
                    type={showConfirmPw ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-navy-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                  />
                </div>
              </div>

              {error && (
                <p className="transition-all duration-200 rounded-lg bg-red-500/15 px-3 py-2 text-center text-sm font-medium text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgb(30_115_232/0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-400 hover:shadow-[0_12px_32px_rgb(30_115_232/0.55)]"
              >
                Continue to location
              </button>

              <p className="text-center text-xs leading-relaxed text-white/40">
                Boarding house owners must verify their identity to list properties on BoardEase.
              </p>
            </form>
          )}

          {/* ===== STEP 2: LOCATION ===== */}
          {step === 'location' && (
            <div className="space-y-5">
              <button type="button" onClick={goBack} className="flex items-center gap-1 text-xs font-medium text-white/50 transition hover:text-white/80">
                ← Back to form
              </button>

              <h3 className="text-base font-bold text-white">Where you'll be</h3>
              <p className="text-sm text-navy-200/80">
                Select the location of your boarding house on the map. This helps boarders find you.
              </p>

              {/* Map */}
              <div className="relative">
                <div
                  ref={mapCanvasRef}
                  onClick={handleMapClick}
                  onMouseDown={handleMapMouseDown}
                  onMouseMove={handleMapMouseMove}
                  onMouseUp={handleMapMouseUp}
                  onMouseLeave={handleMapMouseLeave}
                  className={cn(
                    'relative h-64 w-full rounded-2xl border border-white/10 bg-navy-900 overflow-hidden cursor-crosshair transition',
                    dragging && 'cursor-grabbing',
                  )}
                  role="application"
                  aria-label="Map to select your boarding house location"
                >
                  {/* Simulated map background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-navy-800 via-navy-700 to-navy-900" />

                  {/* Grid */}
                  <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 400" preserveAspectRatio="none">
                    <defs>
                      <pattern id="grid-landlord" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#33C7A5" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid-landlord)" />
                  </svg>

                  {/* Siquijor shape */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
                    <ellipse
                      cx="200"
                      cy="200"
                      rx="80"
                      ry="120"
                      fill="rgba(51,199,165,0.15)"
                      stroke="#33C7A5"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <text x="200" y="195" textAnchor="middle" fill="#33C7A5" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">
                      Siquijor
                    </text>
                  </svg>

                  {/* Location marker */}
                  <div
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
                    style={{ left: `${markerLeft}%`, top: `${markerTop}%` }}
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 shadow-lg ring-2 ring-white">
                        <MapPin size={16} className="text-white" />
                      </div>
                      <div className="mt-1 flex h-2 w-2 rounded-full bg-brand-500 animate-ping" />
                    </div>
                  </div>

                  {/* Instruction */}
                  {!locationSaved && (
                    <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
                      Click to set location
                    </div>
                  )}
                </div>

                {/* Map controls */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 shadow-lg backdrop-blur">
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    className="flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-400"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/>
                      <circle cx="12" cy="12" r="3"/>
                      <line x1="12" y1="2" x2="12" y2="6"/>
                      <line x1="12" y1="18" x2="12" y2="22"/>
                      <line x1="2" y1="12" x2="6" y2="12"/>
                      <line x1="18" y1="12" x2="22" y2="12"/>
                    </svg>
                    Use my location
                  </button>
                </div>
              </div>

              {/* Location info */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-navy-300">Selected location</p>
                    <p className="mt-1 text-sm font-medium text-white">{locationAddress}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-navy-300">
                      <span>Lat: {locationLat.toFixed(5)}</span>
                      <span>Lng: {locationLng.toFixed(5)}</span>
                    </div>
                  </div>
                  {locationSaved && (
                    <div className="flex items-center gap-1 rounded-full bg-mint-400/20 px-2.5 py-1 text-xs font-semibold text-mint-300">
                      <CheckCircle2 size={14} />
                      Set
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-white/40">
                Don&apos;t worry — you can fine-tune this later when you add your boarding house.
              </p>

              {error && (
                <p className="transition-all duration-200 rounded-lg bg-red-500/15 px-3 py-2 text-center text-sm font-medium text-red-300">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={goBack} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white">
                  Back
                </button>
                <button type="button" onClick={confirmLocation} className="flex-1 rounded-xl bg-mint-500 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgb(51_199_165/0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-mint-400">
                  Location set — continue
                </button>
              </div>
            </div>
          )}

          {/* ===== STEP 3: DOCUMENTS ===== */}
          {step === 'documents' && (
            <form onSubmit={handleFinalSubmit} className="space-y-5" noValidate>
              <button type="button" onClick={goBack} className="flex items-center gap-1 text-xs font-medium text-white/50 transition hover:text-white/80">
                ← Back to location
              </button>

              <h3 className="text-base font-bold text-white">Verify your identity</h3>
              <p className="text-sm text-navy-200/80">
                Upload a valid government-issued ID and legal or business documents so BoardEase can verify that you and your boarding house are legitimate. Both attachments are required.
              </p>

              <input
                ref={validIdInputRef}
                id="valid-id-upload"
                type="file"
                accept={IMAGE_ACCEPT}
                required={!validId}
                onChange={(e) => handleImageUpload(e, setValidId)}
                className="sr-only"
              />
              <input
                ref={documentsInputRef}
                id="legal-documents-upload"
                type="file"
                accept={IMAGE_ACCEPT}
                required={!legalDocuments}
                onChange={(e) => handleImageUpload(e, setLegalDocuments)}
                className="sr-only"
              />

              <div className="space-y-4">
                <div>
                  <label htmlFor="valid-id-upload" className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy-200">
                    <IdCard size={14} /> Valid ID <span className="text-mint-300">*</span>
                    <span className="rounded-full bg-mint-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mint-300">Required</span>
                  </label>
                  <p className="mb-2 text-xs text-navy-200/70">Government-issued ID such as a passport, driver&apos;s license, PhilID, or UMID. JPG, JPEG, or PNG only.</p>
                  {validId ? (
                    <div className="flex items-start gap-3 rounded-xl border border-mint-400/40 bg-mint-400/10 p-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/10">
                        <img src={validId.url} alt="Valid ID preview" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{validId.name}</p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-mint-300">
                          <CheckCircle2 size={12} /> Attached
                        </p>
                        <button
                          type="button"
                          onClick={() => validIdInputRef.current?.click()}
                          className="mt-2 text-xs font-semibold text-brand-300 hover:text-brand-200"
                        >
                          Replace file
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setValidId(null); setError('') }}
                        className="rounded-lg p-1.5 text-navy-300 transition hover:bg-red-500/10 hover:text-red-300"
                        aria-label="Remove Valid ID"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => validIdInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 bg-white/5 px-4 py-8 text-center transition hover:border-brand-400/60 hover:bg-white/10"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-navy-200">
                        <Upload size={20} />
                      </span>
                      <span className="text-sm font-semibold text-white">Upload Valid ID</span>
                      <span className="text-xs text-navy-300">JPG, JPEG, or PNG · max 4 MB</span>
                    </button>
                  )}
                </div>

                <div>
                  <label htmlFor="legal-documents-upload" className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy-200">
                    <Shield size={14} /> Documents <span className="text-mint-300">*</span>
                    <span className="rounded-full bg-mint-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mint-300">Required</span>
                  </label>
                  <p className="mb-2 text-xs text-navy-200/70">Legal or business documents that help verify your boarding house, such as a mayor&apos;s permit, DTI/SEC papers, or barangay clearance. JPG, JPEG, or PNG only.</p>
                  {legalDocuments ? (
                    <div className="flex items-start gap-3 rounded-xl border border-mint-400/40 bg-mint-400/10 p-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/10">
                        <img src={legalDocuments.url} alt="Documents preview" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{legalDocuments.name}</p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-mint-300">
                          <CheckCircle2 size={12} /> Attached
                        </p>
                        <button
                          type="button"
                          onClick={() => documentsInputRef.current?.click()}
                          className="mt-2 text-xs font-semibold text-brand-300 hover:text-brand-200"
                        >
                          Replace file
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setLegalDocuments(null); setError('') }}
                        className="rounded-lg p-1.5 text-navy-300 transition hover:bg-red-500/10 hover:text-red-300"
                        aria-label="Remove Documents"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => documentsInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 bg-white/5 px-4 py-8 text-center transition hover:border-brand-400/60 hover:bg-white/10"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-navy-200">
                        <Upload size={20} />
                      </span>
                      <span className="text-sm font-semibold text-white">Upload Documents</span>
                      <span className="text-xs text-navy-300">JPG, JPEG, or PNG · max 4 MB</span>
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <p className="transition-all duration-200 rounded-lg bg-red-500/15 px-3 py-2 text-center text-sm font-medium text-red-300" role="alert">
                  {error}
                </p>
              )}

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <Shield size={18} className="mt-0.5 text-navy-300 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">Your documents are secure</p>
                    <p className="mt-1 text-xs text-navy-200/70">
                      Documents are stored with your landlord application and only accessible by BoardEase verification staff. They are never shared publicly or with boarders.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={goBack} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgb(30_115_232/0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-400 hover:shadow-[0_12px_32px_rgb(30_115_232/0.55)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Building2 size={16} />
                      Create landlord account
                    </span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ===== STEP 4: DONE ===== */}
          {step === 'done' && (
            <div className="flex flex-col items-center py-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mint-400/20 text-mint-300 transition-all duration-300">
                <CheckCircle2 size={26} />
              </span>
              <h4 className="mt-4 text-lg font-bold text-white">Account created!</h4>
              <p className="mt-1 text-sm text-navy-200/80">Taking you to your landlord dashboard…</p>
            </div>
          )}
        </div>

        {/* Step indicator */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {(['form', 'location', 'documents'] as Step[]).map((s, i) => {
            const currentIdx = stepIndex(step)
            const targetIdx = stepIndex(s)
            let width = 'w-4'
            let bg = 'bg-white/10'
            if (currentIdx === targetIdx) {
              width = 'w-16'
              bg = 'bg-brand-400'
            } else if (currentIdx > targetIdx) {
              width = 'w-16'
              bg = 'bg-mint-400/60'
            }
            return (
              <div
                key={s}
                className={cn('h-1.5 rounded-full transition-all duration-300', width, bg)}
              />
            )
          })}
        </div>

        {/* Footer links */}
        {step === 'form' && (
          <p className="mt-6 text-center text-xs text-white/50">
            Already have an account?{' '}
            <a href="/login" className="font-semibold text-brand-300 transition hover:text-brand-200">
              Sign in
            </a>
          </p>
        )}

        {step !== 'form' && (
          <p className="mt-6 text-center text-xs text-white/50">
            <a href="/login" className="font-semibold text-brand-300 transition hover:text-brand-200">
              Sign in instead
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
