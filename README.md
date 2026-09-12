# BoardEase 🏠

A premium, modern SaaS platform for discovering and managing boarding houses in **Siquijor, Philippines** — combining an Airbnb-style discovery experience for boarders with a powerful landlord management dashboard.

Built as a **fully client-side React app backed by a mock API layer** (simulated latency + in-memory mutations via TanStack Query), so everything runs instantly in the browser with no backend setup.

## ✨ Features

**Public site**
- Airbnb-inspired landing page: hero, smart search bar, featured houses, popular locations, categories, how-it-works, animated stats, testimonials, CTA
- Search page with filters: municipality, barangay, school nearby, budget slider, room type, gender policy, amenities, min rating, available-only
- Boarding house details: gallery, amenities, house rules, curfew, visitor policy, embedded map, category rating breakdown, reviews, similar houses

**Landlord dashboard** (`/dashboard`)
- Overview: income, occupancy, vacancy, late payments + charts + AI insights
- Rooms: add / edit / delete rooms, capacity bars, occupants
- Boarders: search, filter, profiles, add & remove
- Payments: filters, **mark-as-paid** (updates dashboard + analytics + AI live), digital receipts with QR
- Analytics: revenue, occupancy, forecast, gender, school, late-trend, top-rooms charts
- Reports: print-ready PDF preview + real CSV (Excel) exports
- Reviews: rating breakdown + landlord replies
- Subscription plans (Starter / Standard / Premium)
- Settings: profile, notification preferences, language (EN/Cebuano)
- **AI Assistant**: answers questions like *"Who hasn't paid?"* with tables, stat cards, and charts — powered only by the mock database

## 🚀 Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run lint
```

## 🛠 Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · TanStack Query · React Router v7 · Framer Motion · Recharts · Lucide icons

## 🎨 Brand

| Color | Hex | Usage |
| --- | --- | --- |
| Navy | `#0B2D63` | Headings, sidebar, footer, charts |
| Blue | `#1E73E8` | Buttons, links, active states |
| Green | `#33C7A5` | Success, availability, paid |
| Background | `#F8FAFC` | App surface |

## 📁 Structure

```
src/
  server/          # Mock backend: types, seed DB, API layer, AI engine
  lib/             # React Query hooks + utils
  components/      # UI kit, house cards, layout, landing sections
  pages/           # Landing, Search, HouseDetails, dashboard/*
```

The mock backend lives in `src/server/` — swap its async functions for real HTTP calls to `getHouses`, `getDashboardOverview`, `askAssistant`, etc. to go full-stack later.

---

## 🧑‍🎓 Boarder portal

Signed-in boarders (`/boarder`) get one account type that adapts to their accommodation status:

- **My Home** — shows the real active accommodation (house, room, rent, due date, landlord, amenities, contract, curfew) when one exists, or a discovery-focused *Find Your Next Home* empty state when it does not. Payment records are view-only; there is **no online payment** anywhere in BoardEase.
- **Browse Houses** — free-text search (name, location, room type, amenity), location / price / availability / amenity filters, active-filter chips, result count, sorting, and a key-free **List / Map** toggle.
- **Favorites** — heart any house from cards, details, compare or favorites; stored per boarder account.
- **Compare** — up to 4 houses side by side with differences highlighted (lowest rent, most available, highest rated).
- **My Reservations** — request a room, review it, then track PENDING / APPROVED / DECLINED / CANCELLED. Owners approve or decline from `/dashboard/reservations`, which notifies the boarder and (on approval) assigns the accommodation shown on My Home.
- **Messages** — text conversations with owners, started from *Contact Owner* on a house page. The owner side (`/dashboard/messages`) replies through the same threads.
- **My Payments / My Reviews** — the boarder's own records only; reviews can be written and edited once per house.
- **Notifications** — reservation, message and room-availability alerts with unread badge, mark-as-read and deep links.
- **Virtual Boarding Assistant** — a floating FAQ helper that answers from registered boarding-house data. It is rule-based FAQ logic, not an AI recommendation engine.
- **Sign up** — the login screen offers *“Don't have an account yet? Sign up”*, which creates a boarder account (`POST /api/auth/register`) and signs it in. Owner accounts are provisioned by BoardEase administration.
- **Profile menu** — Profile, Account Settings, View public site and Log out (the profile avatar no longer logs you out directly).
- **Profile photo** — on *Profile → Account Settings* a boarder can attach a picture (JPG/PNG/WebP). It is centre-cropped and resized to 320×320 in the browser, stored on `users.avatar_url`, and replaces the initials avatar immediately in the topbar, profile menu, sidebar, reviews and the owner's boarder/room views. Photos can be changed or removed at any time; removing falls back to coloured initials.

### Database setup

The boarder features need the migration that adds favorites, reservations, conversations, messages and the extra notification fields:

```bash
mysql -u root boardease < database/boarder_features.sql
# or import database/boarder_features.sql in phpMyAdmin
```

Profile photos need one more small migration (it just adds `users.avatar_url`):

```bash
mysql -u root boardease < database/boarder_avatar.sql
# or import database/boarder_avatar.sql in phpMyAdmin
```

The file also contains an **optional, clearly-marked demo-data block** for `boarder@gmail.com` (one accommodation, a two-month rent history, favourites and a review) so both My Home states are testable. `npm run dev` starts both the Express API and Vite, so the boarder portal needs a reachable MySQL database.
