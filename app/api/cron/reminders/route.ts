import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import type { AdminItem } from "@/lib/types";

const reminderTokenPattern = /\[reminder_days=(\d+)\]/;
const lastEmailTokenPattern = /\s*\[last_email_date=\d{4}-\d{2}-\d{2}\]\s*/g;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateString: string) {
  const today = new Date(`${todayIso()}T12:00:00Z`);
  const target = new Date(`${dateString}T12:00:00Z`);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function getReminderDays(item: AdminItem) {
  const match = item.note?.match(reminderTokenPattern);
  const days = match ? Number(match[1]) : 7;
  return Number.isFinite(days) ? days : 7;
}

function wasEmailedToday(item: AdminItem) {
  return item.note?.includes(`[last_email_date=${todayIso()}]`) || false;
}

function withLastEmailDate(note: string | null) {
  const cleanNote = (note || "")
    .replace(lastEmailTokenPattern, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `${cleanNote ? `${cleanNote} ` : ""}[last_email_date=${todayIso()}]`;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateString}T12:00:00Z`));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getSubject(item: AdminItem) {
  const days = daysUntil(item.due_date);

  if (days < 0) {
    return `Overdue: ${item.title}`;
  }

  if (days === 0) {
    return `Due today: ${item.title}`;
  }

  return `Reminder: ${item.title} is due in ${days} days`;
}

function getHtml(item: AdminItem, appUrl: string) {
  const days = daysUntil(item.due_date);
  const timing = days < 0 ? "overdue" : days === 0 ? "due today" : `due in ${days} days`;
  const safeTitle = escapeHtml(item.title);
  const safeAction = escapeHtml(item.action);
  const safeCategory = escapeHtml(item.category);
  const safeCompany = item.company ? escapeHtml(item.company) : null;
  const safeAmount = item.amount ? escapeHtml(item.amount) : null;

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #17211f;">
      <h1 style="font-size: 22px; margin-bottom: 8px;">${safeTitle}</h1>
      <p style="font-size: 16px; margin: 0 0 16px;">This LifeAdmin item is <strong>${timing}</strong>.</p>
      <div style="border: 1px solid #dfe5df; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p><strong>Due date:</strong> ${formatDate(item.due_date)}</p>
        <p><strong>Next action:</strong> ${safeAction}</p>
        <p><strong>Category:</strong> ${safeCategory}</p>
        ${safeCompany ? `<p><strong>Company:</strong> ${safeCompany}</p>` : ""}
        ${safeAmount ? `<p><strong>Amount:</strong> ${safeAmount}</p>` : ""}
      </div>
      <p>
        <a href="${appUrl}/dashboard#reminders" style="background: #0f766e; color: #ffffff; padding: 10px 14px; border-radius: 8px; text-decoration: none; font-weight: 700;">
          Open LifeAdmin
        </a>
      </p>
    </div>
  `;
}

async function sendReminderEmail(to: string, item: AdminItem) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { skipped: true, reason: "Missing RESEND_API_KEY" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lifeadmin-8pff.vercel.app";
  const from = process.env.REMINDER_EMAIL_FROM || "LifeAdmin <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      subject: getSubject(item),
      html: getHtml(item, appUrl)
    })
  });

  if (!response.ok) {
    return {
      skipped: false,
      error: await response.text()
    };
  }

  return { skipped: false };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET) {
    return new Response("Missing CRON_SECRET", { status: 500 });
  }

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase admin environment variables." },
      { status: 500 }
    );
  }

  const supabase = createSupabaseAdminClient()!;
  const { data: items, error } = await supabase
    .from("admin_items")
    .select("*")
    .eq("status", "tracked")
    .order("due_date", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const dueItems = ((items || []) as AdminItem[]).filter((item) => {
    const days = daysUntil(item.due_date);
    return days <= getReminderDays(item) && !wasEmailedToday(item);
  });
  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const item of dueItems) {
    const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(item.user_id);
    const email = userResult?.user?.email;

    if (userError || !email) {
      skipped += 1;
      failures.push(`${item.id}: missing user email`);
      continue;
    }

    const result = await sendReminderEmail(email, item);

    if (result.skipped) {
      skipped += 1;
      continue;
    }

    if ("error" in result && result.error) {
      skipped += 1;
      failures.push(`${item.id}: ${result.error}`);
      continue;
    }

    sent += 1;
    await supabase
      .from("admin_items")
      .update({ note: withLastEmailDate(item.note) })
      .eq("id", item.id);
  }

  return NextResponse.json({
    ok: true,
    checked: items?.length || 0,
    due: dueItems.length,
    sent,
    skipped,
    failures
  });
}
