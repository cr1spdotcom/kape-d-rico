# Kape d' Rico

Black coffee. Clear mind.

A single-page, minimalist coffee shop website. Static HTML/CSS/JS — no build step, no dependencies.

## Run

Open `index.html` directly in a browser, or serve the folder:

```bash
npx serve .
```

## Structure

- `index.html` — all sections (hero, story, brew list, featured, space, voices, visit, footer)
- `styles.css` — design system and responsive layout (breakpoint: 768px)
- `script.js` — nav scroll state, mobile menu, scroll reveals, visit form submit
- `api/submit.js` — Vercel serverless function that proxies the visit form to GoHighLevel
- `vercel.json` / `package.json` — Vercel runtime config

## Notes

- Fonts: Cormorant Garamond + DM Sans via Google Fonts
- Images: Unsplash, rendered grayscale via CSS filter

## Deploy + GoHighLevel setup

The visit form posts to `/api/submit`, a Vercel serverless function that creates a
contact in GoHighLevel, attaches the booking details as a note, and adds the
contact to a list (which triggers your GHL automation).

### 1. Set environment variables

In your Vercel project: **Settings → Environment Variables**, add:

| Variable | Value |
| --- | --- |
| `GHL_TOKEN` | your GoHighLevel Private Integration token (`pit-...`) |
| `GHL_LOCATION_ID` | your GHL location id |
| `GHL_LIST_ID` | the contact list id to add submissions to |

For local dev, copy `.env.example` to `.env` and fill in the same values
(`.env` is gitignored — never commit real secrets).

### 2. Deploy

```bash
npm i -g vercel   # once
vercel            # preview deploy
vercel --prod     # production deploy
```

### 3. Verify

Submit the Visit form on the deployed site and confirm a new contact appears
in your GHL list. The function requires `contacts.write` scope on the token.

> The GHL token is server-side only — it is never shipped to the browser.
