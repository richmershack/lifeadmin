import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminItem } from "@/lib/types";

const documentBucket = "lifeadmin-documents";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { id } = await params;
  const { data, error } = await supabase
    .from("admin_items")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.redirect(new URL("/dashboard?message=Document not found.", request.url));
  }

  const item = data as AdminItem;

  if (!item.document_path) {
    return NextResponse.redirect(new URL("/dashboard?message=No document is attached.", request.url));
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(documentBucket)
    .createSignedUrl(item.document_path, 60);

  if (signedError || !signed?.signedUrl) {
    return NextResponse.redirect(
      new URL("/dashboard?message=Could not open that document.", request.url)
    );
  }

  return NextResponse.redirect(signed.signedUrl);
}
