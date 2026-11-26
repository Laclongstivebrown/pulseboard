# Pulseboard

A local-first freelance cash-flow forecasting, open receivables ledger, and tax reserve planning dashboard built with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, and **shadcn/ui**.

## Features

- **Real-Time KPI Strip:** Tracks live Cash on Hand, runway days, 90-day projected balance, effective tax reserve target/gap, and open/overdue receivables.
- **Interactive 90-Day Forecast Timeline:** Responsive SVG chart comparing baseline vs. scenario-adjusted trajectories across `30D`, `60D`, and `90D` horizons with hover day-event inspection and a configurable cash safety floor line.
- **Scenario Lab:** Live sliders for monthly retainer delta, operating expense trim %, invoice collection shift (days), and effective tax reserve rate.
- **Actionable Alerts:** Automatic banners for overdue invoices, safety-floor dips, burn-target overages, and tax reserve shortfalls.
- **Cash-Flow Ledger (`/transactions`):** Full CRUD for invoices, retainers, and expenses with Zod form validation, real-time search, kind/status/sort filters, one-click **Mark as paid**, and RFC-4180 CSV export.
- **Settings & Backups (`/settings`):** Opening balance anchor, default tax rate, safety floor, monthly burn target, obsidian dark/light mode toggle, JSON workspace export/import, and demo-data reset.
- **Keyboard Shortcuts:** `1` (Overview), `2` (Ledger), `3` (Settings), `N` or `Ctrl/Cmd+K` (New entry).

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack) + React 19
- **Language:** TypeScript (`strict: true`)
- **Styling & UI:** Tailwind CSS v4 + shadcn/ui (`@base-ui/react`) + Lucide icons
- **Validation & Testing:** Zod + Vitest

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Optional environment configuration:**
   ```bash
   cp .env.example .env.local
   ```
   No external API keys or database servers are required; workspace state persists locally in `localStorage` and initializes with seeded demo data on first launch.

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Next.js development server |
| `npm run build` | Create production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint across the repository |
| `npm test` | Run Vitest unit tests (`src/lib/__tests__/forecast.test.ts`) |

## Project Structure

```text
src/
├── app/
│   ├── page.tsx                 # Overview dashboard
│   ├── transactions/page.tsx    # Full ledger view
│   ├── settings/page.tsx        # Guardrails, theme, JSON backup/reset
│   ├── layout.tsx               # Root layout, fonts & providers
│   └── globals.css              # Design tokens & Tailwind theme
├── components/
│   ├── pulseboard/              # App shell, KPI strip, SVG chart, scenario lab, ledger
│   └── ui/                      # shadcn/ui primitives
└── lib/
    ├── forecast.ts              # Pure 90-day cash-flow projection & alert engine
    ├── schemas.ts               # Zod validation schemas & domain types
    ├── store.tsx                # Client persistence store (useSyncExternalStore)
    ├── csv.ts                   # RFC-4180 CSV serializer
    ├── format.ts                # UTC date math & Intl currency formatters
    ├── seed.ts                  # Seeded initial studio workspace
    └── __tests__/               # Vitest domain unit tests
```

## License

[MIT](./LICENSE)
