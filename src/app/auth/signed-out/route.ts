import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** For a session whose profile no longer exists (the account was purged): clear it and say why. */
export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/sign-in?account=gone", request.url));
}
