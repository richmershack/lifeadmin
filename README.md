# LifeAdmin

LifeAdmin is a personal command center for bills, renewals, documents, and deadlines.

This version is the first SaaS foundation:

- Next.js App Router
- Supabase Auth
- Supabase Postgres data storage
- Supabase private document storage
- User-protected dashboard
- Capture flow for pasted emails and notices
- File attachments for bills, renewals, receipts, and documents
- AI extraction for pasted text, image uploads, and PDFs
- Review inbox for extracted items
- Vault and deadline tracking

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
```

Run the app:

```bash
npm run dev
```

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. The schema creates the `admin_items` table and the private `lifeadmin-documents` storage bucket.
5. Copy your project URL and publishable key into Vercel environment variables.

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` for AI extraction
- `GEMINI_MODEL` optional, defaults to `gemini-3.5-flash`
- `OPENAI_API_KEY` optional fallback for AI extraction
- `OPENAI_MODEL` optional fallback model, defaults to `gpt-5-mini`

## Deploy To Vercel

The repo is now a Next.js app. Use:

- Framework preset: Next.js
- Build command: `npm run build`
- Output directory: leave default

## Next Product Steps

- Add reminder emails
- Add Stripe subscriptions and usage limits
