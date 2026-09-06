import { Globe, Mail, MapPin, MessageCircle, Send, Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const COLS = [
  {
    title: 'Explore',
    links: ['Boarding houses', 'Popular locations', 'Categories', 'New listings', 'Siquijor guide'],
  },
  {
    title: 'For Landlords',
    links: ['Landlord dashboard', 'Room management', 'Payment tracking', 'AI Assistant', 'Subscription plans'],
  },
  {
    title: 'Company',
    links: ['About us', 'Careers', 'Press', 'Blog', 'Contact'],
  },
]

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-navy-900 text-navy-100">
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-mint-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex" aria-label="BoardEase home">
              <img src="/logo.png" alt="BoardEase" decoding="async" className="h-14 w-auto rounded-lg" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-200">
              The smart way to discover and manage boarding houses in Siquijor — trusted by boarders, students, and
              landlords across the island.
            </p>
            <div className="mt-5 flex gap-2">
              {[Globe, Send, Share2, MessageCircle].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-navy-200 transition hover:bg-brand-500 hover:text-white"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-white">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-navy-200 transition hover:text-mint-300">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint-400/15 text-mint-300">
              <Mail size={18} />
            </span>
            <div>
              <p className="font-semibold text-white">Stay in the loop</p>
              <p className="text-sm text-navy-200">New boarding houses & island tips, once a month.</p>
            </div>
          </div>
          <form
            className="flex w-full max-w-sm gap-2"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              required
              placeholder="you@email.com"
              className="h-11 flex-1 rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-navy-300 outline-none transition focus:border-mint-400"
            />
            <button className="h-11 rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white transition hover:bg-brand-600">
              Subscribe
            </button>
          </form>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-navy-300 sm:flex-row">
          <p>© 2026 BoardEase. Made with ❤️ in Siquijor, Philippines.</p>
          <p className="flex items-center gap-1.5">
            <MapPin size={13} className="text-mint-400" /> San Juan · Larena · Lazi · Maria · Siquijor · Enrique Villanueva
          </p>
          <div className="flex gap-5">
            <a href="#" className="transition hover:text-white">Privacy</a>
            <a href="#" className="transition hover:text-white">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
