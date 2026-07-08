import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  return (
    <main>
      <section className="auth-grid">
        <div className="panel">
          <p className="eyebrow">LifeAdmin</p>
          <h1>Your command center for bills, renewals, documents, and deadlines.</h1>
          <p className="muted">Capture scattered admin, review what matters, and prevent missed fees, forgotten renewals, and lost paperwork.</p>
          <div className="top-actions">
            <Link className="primary-action" href="/login">Sign in</Link>
            <Link className="ghost-button" href="/dashboard">View setup</Link>
          </div>
        </div>
        <div className="panel">
          <p className="eyebrow">Paid wedge</p>
          <h2>Catches expensive things people forget</h2>
          <div className="stack">
            {['Insurance renewal','Quarterly tax payment','Subscription review'].map((title) => <div className="admin-item warning" key={title}><div className="status-dot"/><div className="item-main"><h3>{title}</h3><p>Review before it costs money.</p></div></div>)}
          </div>
        </div>
      </section>
    </main>
  );
}
