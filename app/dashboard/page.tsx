import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createAdminItem,
  removeAdminItemDocument,
  signOut,
  updateAdminItemStatus
} from "@/app/actions";
import { SubmitButton } from "@/app/components/submit-button";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { AdminItem } from "@/lib/types";

const categories = [
  "Bill",
  "Renewal",
  "Subscription",
  "Contract",
  "Warranty",
  "Tax document",
  "Appointment",
  "Other"
];

function todayAtNoon() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
}

function daysUntil(dateString: string) {
  const today = todayAtNoon();
  const target = new Date(`${dateString}T12:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateString}T12:00:00`));
}

function formatToday() {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(todayAtNoon());
}

function ItemCard({ item, inbox = false }: { item: AdminItem; inbox?: boolean }) {
  const days = daysUntil(item.due_date);
  const urgency = days <= 3 ? "urgent" : days <= 14 ? "warning" : "";

  return (
    <article className={`admin-item ${urgency}`}>
      <div className="status-dot" />
      <div className="item-main">
        <div className="item-title-row">
          <h3>{item.title}</h3>
          <span className="pill">
            {days < 0 ? "Overdue" : days === 0 ? "Today" : `${days} days`}
          </span>
        </div>
        <p>{item.action}</p>
        <div className="item-meta">
          <span>{item.category}</span>
          <span>{item.company || "Company pending"}</span>
          <span>{formatDate(item.due_date)}</span>
          <span>{item.amount || "Amount pending"}</span>
          {item.document_name ? <span>Attached: {item.document_name}</span> : null}
        </div>
      </div>
      <div className="item-actions">
        {item.document_name ? (
          <>
            <Link className="ghost-button action-button" href={`/documents/${item.id}`} target="_blank">
              View file
            </Link>
            <form action={removeAdminItemDocument}>
              <input name="id" type="hidden" value={item.id} />
              <SubmitButton className="danger-button" pendingLabel="Removing...">
                Remove file
              </SubmitButton>
            </form>
          </>
        ) : null}
        <form action={updateAdminItemStatus}>
          <input name="id" type="hidden" value={item.id} />
          <input name="status" type="hidden" value={inbox ? "tracked" : "done"} />
          <SubmitButton className="ghost-button" pendingLabel={inbox ? "Approving..." : "Saving..."}>
            {inbox ? "Approve" : "Done"}
          </SubmitButton>
        </form>
      </div>
    </article>
  );
}

function SetupNotice() {
  return (
    <main>
      <section className="panel">
        <p className="eyebrow">Setup needed</p>
        <h1>Connect Supabase to unlock accounts and saved data.</h1>
        <p className="muted">
          Create a Supabase project, run the schema in <code>supabase/schema.sql</code>, then add
          these variables in Vercel.
        </p>
        <div className="setup-note">
          <p>
            <code>NEXT_PUBLIC_SUPABASE_URL</code>
          </p>
          <p>
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          </p>
        </div>
        <Link className="primary-action" href="/">
          Back to LifeAdmin
        </Link>
      </section>
    </main>
  );
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string; view?: string }>;
}) {
  const { message } = await searchParams;

  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase!.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase!
    .from("admin_items")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "done")
    .order("due_date", { ascending: true });

  const items = (data || []) as AdminItem[];
  const tracked = items.filter((item) => item.status === "tracked");
  const inbox = items.filter((item) => item.status === "inbox");
  const attention = tracked.filter((item) => daysUntil(item.due_date) <= 14);
  const renewals = tracked.filter((item) => ["Renewal", "Subscription"].includes(item.category));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">LA</div>
          <div>
            <strong>LifeAdmin</strong>
            <span>Daily admin, handled</span>
          </div>
        </div>
        <nav className="nav-list">
          <a className="nav-item active" href="#dashboard">
            <span>D</span>
            <span>Dashboard</span>
          </a>
          <a className="nav-item" href="#capture">
            <span>+</span>
            <span>Capture</span>
          </a>
          <a className="nav-item" href="#inbox">
            <span>I</span>
            <span>Inbox</span>
          </a>
          <a className="nav-item" href="#vault">
            <span>V</span>
            <span>Vault</span>
          </a>
        </nav>
        <div className="sidebar-panel">
          <span className="eyebrow">Signed in</span>
          <strong>{user.email}</strong>
          <form action={signOut}>
            <SubmitButton className="danger-button" pendingLabel="Signing out...">
              Sign out
            </SubmitButton>
          </form>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">{formatToday()}</p>
            <h1>Dashboard</h1>
          </div>
          <div className="top-actions">
            <a className="primary-action" href="#capture">
              Capture item
            </a>
          </div>
        </header>

        {message ? <div className="setup-note">{message}</div> : null}
        {error ? <div className="setup-note">{error.message}</div> : null}

        <section id="dashboard">
          <div className="metrics-grid">
            <article className="metric">
              <span>Needs action</span>
              <strong>{tracked.filter((item) => daysUntil(item.due_date) <= 7).length}</strong>
              <span>due in the next 7 days</span>
            </article>
            <article className="metric">
              <span>Inbox</span>
              <strong>{inbox.length}</strong>
              <span>waiting for review</span>
            </article>
            <article className="metric">
              <span>Renewals</span>
              <strong>{renewals.length}</strong>
              <span>worth checking</span>
            </article>
            <article className="metric">
              <span>Tracked</span>
              <strong>{tracked.length}</strong>
              <span>active admin items</span>
            </article>
          </div>

          <div className="content-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Needs attention</span>
                  <h2>Today and this week</h2>
                </div>
              </div>
              <div className="stack">
                {attention.length ? (
                  attention.map((item) => <ItemCard item={item} key={item.id} />)
                ) : (
                  <div className="empty-state">Nothing urgent. Your week is unusually calm.</div>
                )}
              </div>
            </section>

            <section className="panel" id="inbox">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Review</span>
                  <h2>Extracted items</h2>
                </div>
              </div>
              <div className="stack">
                {inbox.length ? (
                  inbox.map((item) => <ItemCard inbox item={item} key={item.id} />)
                ) : (
                  <div className="empty-state">No extracted items are waiting for approval.</div>
                )}
              </div>
            </section>
          </div>
        </section>

        <section className="capture-layout" id="capture" style={{ marginTop: 18 }}>
          <section className="panel">
            <span className="eyebrow">Capture</span>
            <h2>Add a bill, renewal, contract, receipt, or notice</h2>
            <form action={createAdminItem}>
              <label>
                Item title
                <input name="title" placeholder="Health insurance renewal" required />
              </label>
              <label>
                Document or email text
                <textarea name="sourceText" placeholder="Paste a notice, invoice, email, or reminder here" />
              </label>
              <label>
                Attach document
                <input
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx"
                  name="document"
                  type="file"
                />
              </label>
              <div className="form-row">
                <label>
                  Category
                  <select name="category" defaultValue="Renewal">
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Due date
                  <input name="dueDate" type="date" required />
                </label>
              </div>
              <label>
                Next action
                <input name="action" placeholder="Review before auto-renewal" />
              </label>
              <SubmitButton className="primary-action" pendingLabel="Capturing...">
                Extract and review
              </SubmitButton>
            </form>
          </section>

          <section className="panel" id="vault">
            <span className="eyebrow">Vault</span>
            <h2>Saved documents and tasks</h2>
            <div className="timeline">
              {items.length ? (
                items.map((item) => (
                  <article className="timeline-row" key={item.id}>
                    <div className="timeline-date">{formatDate(item.due_date)}</div>
                    <div>
                      <h3>{item.title}</h3>
                      <p className="muted">{item.action}</p>
                      <div className="item-meta">
                        <span>{item.category}</span>
                        <span>{item.status}</span>
                        {item.document_name ? (
                          <>
                            <Link href={`/documents/${item.id}`} target="_blank">
                              View document
                            </Link>
                            <form action={removeAdminItemDocument} className="inline-form">
                              <input name="id" type="hidden" value={item.id} />
                              <SubmitButton className="danger-link" pendingLabel="Removing...">
                                Remove file
                              </SubmitButton>
                            </form>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">No saved items yet. Capture your first admin task.</div>
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
