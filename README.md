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
