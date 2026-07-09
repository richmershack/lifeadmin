import { redirect } from "next/navigation";
import { signIn, signUp } from "@/app/actions";
import { SubmitButton } from "@/app/components/submit-button";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    }
  }

  return (
    <main>
      <section className="auth-grid">
        <div className="panel">
          <p className="eyebrow">Account</p>
          <h1>Sign in to LifeAdmin</h1>
          <p className="muted">
            This foundation uses Supabase Auth. Add your Supabase environment variables in Vercel
            before real users can sign in.
          </p>

          {!hasSupabaseEnv() ? (
            <div className="setup-note">
              Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel.
            </div>
          ) : null}

          {message ? <div className="setup-note">{message}</div> : null}
        </div>

        <div className="panel">
          <p className="eyebrow">Sign in</p>
          <form action={signIn}>
            <label>
              Email
              <input name="email" type="email" placeholder="you@example.com" required />
            </label>
            <label>
              Password
              <input name="password" type="password" minLength={6} required />
            </label>
            <SubmitButton className="primary-action" pendingLabel="Signing in...">
              Sign in
            </SubmitButton>
          </form>

          <form action={signUp}>
            <p className="eyebrow">New account</p>
            <label>
              Email
              <input name="email" type="email" placeholder="you@example.com" required />
            </label>
            <label>
              Password
              <input name="password" type="password" minLength={6} required />
            </label>
            <SubmitButton className="ghost-button" pendingLabel="Creating...">
              Create account
            </SubmitButton>
          </form>
        </div>
      </section>
    </main>
  );
}
