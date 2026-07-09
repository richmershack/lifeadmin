"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminItem } from "@/lib/types";

const reminderTokenValuePattern = /\[reminder_days=(\d+)\]/;
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
  const match = item.note?.match(reminderTokenValuePattern);
  const days = match ? Number(match[1]) : 7;
  return Number.isFinite(days) ? days : 7;
}

function withLastEmailDate(note: string | null) {
  const cleanNote = (note || "")
    .replace(lastEmailTokenPattern, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `${cleanNote ? `${cleanNote} ` : ""}[last_email_date=${todayIso()}]`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatEmailDate(dateString: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateString}T12:00:00Z`));
}

function getReminderEmailSubject(item: AdminItem) {
  const days = daysUntil(item.due_date);

  if (days < 0) {
    return `Overdue: ${item.title}`;
  }

  if (days === 0) {
    return `Due today: ${item.title}`;
  }

  return `Reminder: ${item.title} is due in ${days} days`;
}

function getReminderEmailHtml(item: AdminItem) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lifeadmin-8pff.vercel.app";
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
        <p><strong>Due date:</strong> ${formatEmailDate(item.due_date)}</p>
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
    throw new Error("Add RESEND_API_KEY in Vercel first.");
  }

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
      subject: getReminderEmailSubject(item),
      html: getReminderEmailHtml(item)
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function sendReminderEmailsNow() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/dashboard?message=Add Supabase environment variables first.");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.email) {
    redirect("/dashboard?message=Your account needs an email address before reminders can send.");
  }

  const { data, error } = await supabase
    .from("admin_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "tracked")
    .order("due_date", { ascending: true });

  if (error) {
    redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  }

  const dueItems = ((data || []) as AdminItem[]).filter((item) => {
    const days = daysUntil(item.due_date);
    return days <= getReminderDays(item);
  });

  if (!dueItems.length) {
    redirect("/dashboard?message=No due reminders to email yet. Create an item due today, then try again.");
  }

  try {
    for (const item of dueItems.slice(0, 5)) {
      await sendReminderEmail(user.email, item);
      await supabase
        .from("admin_items")
        .update({ note: withLastEmailDate(item.note) })
        .eq("id", item.id)
        .eq("user_id", user.id);
    }
  } catch (sendError) {
    const message = sendError instanceof Error ? sendError.message : "Reminder email could not be sent.";
    redirect(`/dashboard?message=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?message=${encodeURIComponent(`Sent ${Math.min(dueItems.length, 5)} reminder email(s).`)}`);
}
