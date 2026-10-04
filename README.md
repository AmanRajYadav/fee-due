# Fluence Fees

A small personal app for tracking monthly coaching fees at Fluence (Mangla and
Sarkanda branches). One user, used on a phone.

- **Due**: who owes right now, most overdue first. Mark paid (full or part), make a
  fee-due image, note a reminder.
- **History**: by month (collected / pending) and by student (each month, each payment).
- **Students**: add, edit, remove; fee, due day; the UPI ID shown on images.

Receipts and fee-due notices are drawn as images on the phone and shared through
the phone's own share sheet. The app never writes or sends a message itself.

## How dues work

Dues are never stored. Each student has a due day; a due exists for every month
whose due date has passed since the student's "Track fees from" date. Only
payments are saved. See `src/lib/dues.ts` and its tests.

## No login, by choice

There is no login. The tables are open to the public key that ships in the app,
so **do not store anything private here** (no phone numbers, no parent details).
Anyone who has the app's address could also change the data.

## Run it

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the Supabase URL and anon key.
`http://localhost:3001/fee-due/?demo` shows made-up students without touching
the database (dev server only).

## Database

Run `supabase/schema.sql` once in the Supabase SQL Editor. Real student names
are kept out of this repository; they are added in the app or from a local,
git-ignored `supabase/*private*.sql` file.

## Deploy

Pushing to `main` builds and publishes to GitHub Pages
(`.github/workflows/deploy.yml`). The repository needs two Actions **variables**:
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and Pages set to "GitHub Actions".
