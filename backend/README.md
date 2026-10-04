# SideQuest

Find someone at SFU who is free when you are, and get a side quest to do together.
StormHacks 2026.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL and GEMINI_API_KEY
npm run db:setup             # creates tables (add `-- --reset` to drop and recreate)
npm run seed                 # 25 fake students + 12 events
npm run dev                  # http://localhost:3000
```

## Where things live

- `lib/ai/config.ts`: every model name
- `lib/ai/`: typed AI helpers, each with a fallback
- `lib/free-blocks.ts`: free-block logic (commented for judges)
- `lib/db.ts`: TiDB connection pool and vector helpers
- `lib/auth.ts`: cookie auth (`sq_uid`)
- `scripts/setup-db.ts`, `scripts/seed.ts`: schema and seed data
- `app/globals.css`: design tokens (colors, fonts, shadows)
- `components/ui/`: shadcn/ui components, restyled
