# LifeAdmin

LifeAdmin is a personal command center for bills, renewals, documents, and deadlines.

This version is the first SaaS foundation:

- Next.js App Router
- Supabase Auth
- Supabase Postgres data storage
- User-protected dashboard
- Capture flow for pasted emails and notices
- Review inbox for extracted items
- Vault and deadline tracking

## Local Setup

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Copy your project URL and anon key into Vercel environment variables.

## Deploy To Vercel

Use the Next.js framework preset. Build command: `npm run build`.

## Next Product Steps

- Add real AI document extraction
- Add file uploads to Supabase Storage
- Add reminder emails
- Add Stripe subscriptions and usage limits
