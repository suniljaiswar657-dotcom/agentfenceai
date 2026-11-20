import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const organizationName = url.searchParams.get("org");
  const next = url.searchParams.get("next") || "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?error=verification", url.origin));
    }

    if (organizationName) {
      const { error: organizationError } = await supabase.rpc("create_organization", {
        _name: organizationName,
      });
      if (organizationError) {
        return NextResponse.redirect(new URL("/login?error=workspace", url.origin));
      }
    }
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
