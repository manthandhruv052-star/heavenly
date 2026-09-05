# Heavenly Captured — Photo Studio

Cinematic one-page site for a Bangalore wedding photography studio, with a
GSAP motion layer and a Groq-powered chat assistant.

## Run it

```bash
npm install
cp .env.example .env      # then paste your Groq key into .env
npm run dev
```

Open http://localhost:3000

The site runs fine without a key — the chat widget just returns a clear
"not configured" message instead of crashing.

## The Groq key

Get one at https://console.groq.com/keys and put it in `.env`:

```
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b
```

Locally, the key is only ever read by `server.js` and never sent to the
browser. In production on Vercel, it's read by the serverless function in
`api/chat.js` instead — same rule, it never reaches the client. `.env` is
gitignored either way.

To change what the assistant knows or how it speaks, edit `SYSTEM_PROMPT`.
It exists in two places that must be kept in sync by hand: `server.js` (local
dev) and `api/chat.js` (production on Vercel). It's currently instructed
never to invent prices, phone numbers, or date availability.

## Deploying to Vercel

1. Push this repo to GitHub (see below).
2. In Vercel: **Add New → Project**, import the GitHub repo.
3. Framework preset: **Other**. No build command needed — the site is static
   files in `public/` plus one serverless function in `api/`.
4. Before the first deploy, add an environment variable:
   **Settings → Environment Variables** → `GROQ_API_KEY` = your key
   (and optionally `GROQ_MODEL`, defaults to `openai/gpt-oss-120b`).
5. Deploy. The chat widget will work immediately — no separate server to run.

`api/chat.js` runs on Vercel's Edge Runtime and streams the reply the same
way the local Express route does.

## What to replace before this goes live

Everything below is placeholder and marked as such.

| What | Where |
|---|---|
| Portfolio photos (hero, gallery, story) | `public/index.html` — Unsplash URLs in `background-image` / `src` |
| Contact-sheet photos | `public/main.js` — the `SHEET_IMAGES` array |
| Phone + email | `public/index.html` — the `.enq__contact` block |
| Testimonials | `public/index.html` — the `.river` rows |
| Google rating / review count | `public/index.html` — `.voices__score` |
| Prices | `public/index.html` — `.svc__meta` in each service row |
| Stats (340 weddings, etc.) | `public/index.html` — `data-count` attributes |

The enquiry form validates and confirms in the browser but does not send
anywhere yet — wire the submit handler in `public/main.js` (`enquiry()`)
to your CRM, Formspree, or an email service.

## Structure

```
server.js            Express static server + Groq streaming proxy — LOCAL DEV ONLY
api/chat.js           Vercel Edge Function — same proxy, used in PRODUCTION
vercel.json           Tells Vercel where the static site lives
public/index.html    Markup
public/styles.css    Design tokens and all styling
public/main.js       GSAP timelines + chat client
```

## Design notes

Palette is drawn from a South Indian wedding rather than the usual
black-and-white wedding-site default: warm near-black (`#0A0705`), kumkum
red (`#7A0B1E`), temple brass (`#C9962E`), turmeric, and a jasmine off-white
for the testimonials section, which inverts to light to break up the dark run.

Type is Fraunces (display, with its optical-size and `WONK` axes doing real
work) over Inter Tight (body).

Motion is deliberately concentrated: one orchestrated page-load sequence,
one horizontal scrub through the gallery, and one set piece — the contact
sheet that assembles from scattered frames. Everything else is quiet.
`prefers-reduced-motion` is fully respected; the filmstrip degrades to a
normal horizontal scroll and all pinning is disabled.
