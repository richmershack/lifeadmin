"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { AdminItemStatus } from "@/lib/types";

const documentBucket = "lifeadmin-documents";
const maxDocumentBytes = 8 * 1024 * 1024;

function extractAmount(text: string) {
  const match = text.match(/\$[\d,]+(?:\.\d{2})?/);
  return match ? match[0] : null;
}

function extractCompany(text: string) {
  return text.split(/\s+/).slice(0, 4).join(" ").replace(/[.,]/g, "") || null;
}

function safeFileName(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login?message=Add Supabase environment variables first.");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login?message=Add Supabase environment variables first.");
  }

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/login");
}

export async function createAdminItem(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/dashboard?message=Add Supabase environment variables first.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase!.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const text = String(formData.get("sourceText") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "Other");
  const dueDate = String(formData.get("dueDate") || new Date().toISOString().slice(0, 10));
  const action = String(formData.get("action") || text.slice(0, 140) || "Review this item");
  const document = formData.get("document");
  let documentName: string | null = null;
  let documentPath: string | null = null;
  let documentType: string | null = null;

  if (document instanceof File && document.size > 0) {
    if (document.size > maxDocumentBytes) {
      redirect("/dashboard?message=Document is too large. Use a file under 8 MB.");
    }

    documentName = safeFileName(document.name || "document");
    documentType = document.type || "application/octet-stream";
    documentPath = `${user.id}/${crypto.randomUUID()}-${documentName}`;

    const { error: uploadError } = await supabase!.storage
      .from(documentBucket)
      .upload(documentPath, document, {
        contentType: documentType,
        upsert: false
      });

    if (uploadError) {
      redirect(`/dashboard?message=${encodeURIComponent(uploadError.message)}`);
    }
  }

  const { error } = await supabase!.from("admin_items").insert({
    user_id: user.id,
    title,
    category,
    company: extractCompany(text),
    due_date: dueDate,
    amount: extractAmount(text),
    action,
    note: text ? "Captured from pasted text." : documentName ? "Captured from uploaded document." : null,
    document_name: documentName,
    document_path: documentPath,
    document_type: documentType,
    status: "inbox"
  });

  if (error) {
    redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?view=inbox");
}

export async function updateAdminItemStatus(formData: FormData) {
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "tracked") as AdminItemStatus;
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

  await supabase.from("admin_items").update({ status }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard");
}

export async function removeAdminItemDocument(formData: FormData) {
  const id = String(formData.get("id") || "");
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

  const { data: item, error: itemError } = await supabase
    .from("admin_items")
    .select("document_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (itemError) {
    redirect(`/dashboard?message=${encodeURIComponent(itemError.message)}`);
  }

  if (item?.document_path) {
    const { error: removeError } = await supabase.storage
      .from(documentBucket)
      .remove([item.document_path]);

    if (removeError) {
      redirect(`/dashboard?message=${encodeURIComponent(removeError.message)}`);
    }
  }

  const { error } = await supabase
    .from("admin_items")
    .update({
      document_name: null,
      document_path: null,
      document_type: null,
      note: "Attached document removed."
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
}
