"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return <button onClick={logout} style={{ border: "1px solid #35404b", background: "#151b22", color: "#c6cfd8", borderRadius: 5, padding: "7px 10px", fontSize: 10 }}>Sign out</button>;
}
