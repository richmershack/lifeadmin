"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { AdminItemStatus } from "@/lib/types";

function extractAmount(text: string) {
  const match = text.match(/\$[\d,]+(?:\.\d{2})?/);
  return match ? match[0] : null;
}

function extractCompany(text: string) {
  return text.split(/\s+/).slice(0, 4).join(" ").replace(/[.,]/g, "") || null;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?message=Add Supabase environment variables first.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?message=Add Supabase environment variables first.");
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/login");
}

export async function createAdminItem(formData: FormData) {
  if (!hasSupabaseEnv()) redirect("/dashboard?message=Add Supabase environment variables first.");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase!.auth.getUser();
  if (!user) redirect("/login");
  const text = String(formData.get("sourceText") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "Other");
  const dueDate = String(formData.get("dueDate") || new Date().toISOString().slice(0, 10));
  const action = String(formData.get("action") || text.slice(0, 140) || "Review this item");
  const { error } = await supabase!.from("admin_items").insert({ user_id: user.id, title, category, company: extractCompany(text), due_date: dueDate, amount: extractAmount(text), action, note: text ? "Captured from pasted text." : null, status: "inbox" });
  if (error) redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect("/dashboard?view=inbox");
}

export async function updateAdminItemStatus(formData: FormData) {
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "tracked") as AdminItemStatus;
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/dashboard?message=Add Supabase environment variables first.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.from("admin_items").update({ status }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard");
}
