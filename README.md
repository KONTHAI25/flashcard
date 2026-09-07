# Flashcards — Mobile-First Spaced Repetition MVP

Next.js 15 App Router · TypeScript · Tailwind v4 · localStorage · PWA-ready

## Local Development

```bash
npm install
npm run dev        # → http://localhost:3000
```

## Production Build

```bash
npm run build      # passes — 8 routes, ~108 kB first load
npm run start      # serve locally on :3000
```

### Route Map

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Static | Deck list — create, delete |
| `/deck/[id]` | Dynamic | Cards CRUD per deck |
| `/study` | Static | Decks with due cards |
| `/study/[id]` | Dynamic | Flip-card SRS session |
| `/quiz` | Static | Quiz deck picker |
| `/quiz/[id]` | Dynamic | 4-option multiple choice |
| `/manifest.webmanifest` | Static | PWA install prompt |

## Deploy to Vercel (Free Hobby Tier)

### Option A — GitHub → Vercel (recommended)

```bash
# Remote already configured:
git remote -v   # → https://github.com/KONTHAI25/flashcard.git

# Create the empty repo on GitHub (if not yet), then:
git push -u origin main
```

Then on [vercel.com/new](https://vercel.com/new):

1. **Import** the `flashcard` repo
2. Framework = **Next.js** (auto-detected)
3. No env vars needed for MVP (localStorage only)
4. Click **Deploy** — done in ~30 s

### Option B — Vercel CLI

```bash
npx vercel          # interactive deploy (prompts for project name)
npx vercel --prod   # deploy as production
```

### Hobby Tier Limits

| Resource | Free limit |
|----------|-----------|
| Bandwidth | 100 GB / month |
| Serverless invocations | 100,000 / month |
| Build minutes | 6,000 / month |
| Concurrent builds | 1 |
| Custom domains | 50 |
| Edge Middleware | Included |

> This app is fully client-side — bandwidth is the only limit that matters.
> localStorage caps at ~5 MB per origin, plenty for flashcard decks.

## Future: Neon Postgres

When you outgrow localStorage:

1. Sign up at [neon.tech](https://neon.tech) (Hobby: 0.5 GB free)
2. Copy the connection string into `.env.local`:
   ```
   DATABASE_URL="postgresql://...@ep-xxx.us-east-2.aws.neon.tech/db?sslmode=require"
   ```
3. Wire `lib/store.ts` → Prisma or Drizzle ORM (update `.env.example` has the placeholder)

## Project Structure

```
app/
  layout.tsx            # Root layout · PWA metadata · viewportFit=cover
  page.tsx              # Deck CRUD list
  manifest.ts           # PWA manifest
  globals.css           # Tailwind v4 · card-flip animation
  deck/[id]/page.tsx    # Cards CRUD
  study/page.tsx        # Study index
  study/[id]/page.tsx   # Flip + Again/Good/Easy
  quiz/page.tsx         # Quiz index
  quiz/[id]/page.tsx    # Multiple-choice quiz
components/
  Header.tsx            # Sticky top nav · Sets/Study/Quiz
  Button.tsx            # Primary/secondary/danger/ghost
  FlashCard.tsx         # CSS perspective flip card
  Sheet.tsx             # Bottom-sheet modal
lib/
  types.ts              # Deck, Card interfaces
  store.ts              # localStorage CRUD + seed demo deck
  srs.ts                # SM-2-lite: reviewCard, isDue, nextReviewLabel
```

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4
- **Storage:** localStorage
- **SRS:** Custom SM-2-lite (interval + ease + streak)
- **PWA:** manifest.ts + viewportFit=cover + safe-area padding
