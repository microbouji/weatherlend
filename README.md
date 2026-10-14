# Weatherlend

Community lending for extreme weather — a student-team prototype for Zurich.
Students lend and borrow what weather events ask for (fans in heat waves,
heaters in cold snaps, pumps in heavy rain) and pay with points instead of money.

## Run it locally

Prerequisites: Node 18+.

```sh
npm install
npm run setup   # creates the SQLite database and loads sample data
npm run dev     # http://localhost:3000
```

## Everyday commands

| Command           | What it does                                      |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Start the app at http://localhost:3000            |
| `npm run setup`   | Create/migrate the DB and load sample data       |
| `npm run db:seed` | Reload the sample data (keeps the schema)         |
| `npm run db:reset`| Wipe the database and reload the sample data     |
| `npm run build`   | Production build (`npm start` serves it)          |
| `npm run lint`    | ESLint                                            |

## Good to know

- **No login in this prototype.** Pick a demo user in the header; the points
  balance next to it is live.
- **Sample data mirrors the UI mockup** (`docs/client-mockup.pdf`): 7 phenomena,
  6 users, 18 offers, 6 requests. Filter chips show live counts from the database.
- **Photos are optional uploads**, stored in `public/uploads/` (git-ignored).
  Offers without a photo render a placeholder.
- **Emails are stubbed.** Booking and cancelling log what the full version would
  send (see `lib/notify.ts`); nothing leaves the machine.
- **Calendar page is a Sprint 2 stretch goal** (per tender: nice-to-have). The
  no-double-booking rule it visualises is already enforced when booking.

## Tech

Next.js (App Router, TypeScript) + Prisma + SQLite + Tailwind. See `AGENTS.md`
for the domain rules and conventions behind this codebase.

## Demo deployment (e.g. Vercel)

The app also runs on hosts without a persistent disk: on first boot it applies
the migrations and loads the sample data by itself (see `lib/bootstrap.ts`).
Set these environment variables:

| Variable       | Value                          |
| -------------- | ------------------------------ |
| `DATABASE_URL` | `file:/tmp/weatherlend.db`     |
| `UPLOADS_DIR`  | `/tmp/weatherlend-uploads`     |

Ephemeral hosting means ephemeral data: each server instance keeps its own
SQLite file, and everything resets when instances recycle. For the client this
is a demo link, not the product — local runs are unaffected.
