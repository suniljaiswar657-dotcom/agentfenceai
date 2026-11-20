"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("My Workspace");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?org=${encodeURIComponent(organization.trim())}`,
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          const { error: orgError } = await supabase.rpc("create_organization", { _name: organization.trim() });
          if (orgError) throw orgError;
          router.replace("/");
          router.refresh();
        } else {
          setMessage("Account created. Email verification link check karo; verify karne ke baad workspace automatically create hoga.");
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      const { data: memberships, error: membershipError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .limit(1);
      if (membershipError) throw membershipError;

      if (!memberships?.length) {
        const { error: orgError } = await supabase.rpc("create_organization", { _name: organization.trim() });
        if (orgError) throw orgError;
      }

      const next = search.get("next") || "/";
      router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "#090c10", color: "#f1f4f7", fontFamily: "Arial, sans-serif" }}>
      <section style={{ width: "min(440px, 100%)", border: "1px solid #29323c", borderRadius: 14, padding: 28, background: "#11161c", boxShadow: "0 24px 80px #0008" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 30 }}>
          <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", border: "1px solid #66343a", borderRadius: 10, color: "#ff777c", fontSize: 25 }}>⬡</span>
          <div><strong style={{ letterSpacing: 1 }}>AGENTFENCE <span style={{ color: "#ed5b61" }}>AI</span></strong><small style={{ display: "block", color: "#84909c", fontSize: 9, letterSpacing: 2, marginTop: 4 }}>AGENT GOVERNANCE PLATFORM</small></div>
        </div>
        <p style={{ color: "#ef777b", fontSize: 10, letterSpacing: 2 }}>SECURE WORKSPACE ACCESS</p>
        <h1 style={{ fontSize: 27, margin: "8px 0" }}>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p style={{ color: "#929eaa", fontSize: 13, lineHeight: 1.6 }}>Sign in to manage agent permissions, policies and human approvals.</p>
        <div style={{ display: "flex", gap: 8, padding: 4, borderRadius: 7, background: "#090d12", margin: "22px 0" }}>
          <button type="button" onClick={() => { setMode("signin"); setError(""); setMessage(""); }} style={{ flex: 1, padding: 10, border: 0, borderRadius: 5, background: mode === "signin" ? "#2b2024" : "transparent", color: mode === "signin" ? "#fff" : "#8995a1" }}>Sign in</button>
          <button type="button" onClick={() => { setMode("signup"); setError(""); setMessage(""); }} style={{ flex: 1, padding: 10, border: 0, borderRadius: 5, background: mode === "signup" ? "#2b2024" : "transparent", color: mode === "signup" ? "#fff" : "#8995a1" }}>Create account</button>
        </div>
        <form onSubmit={submit}>
          {mode === "signup" && <label style={{ display: "block", color: "#b9c2cb", fontSize: 11, marginBottom: 14 }}>Workspace name<input required minLength={2} maxLength={120} value={organization} onChange={e => setOrganization(e.target.value)} style={fieldStyle} /></label>}
          {mode === "signin" && <label style={{ display: "block", color: "#b9c2cb", fontSize: 11, marginBottom: 14 }}>Workspace name (new account only)<input value={organization} onChange={e => setOrganization(e.target.value)} style={fieldStyle} /></label>}
          <label style={{ display: "block", color: "#b9c2cb", fontSize: 11, marginBottom: 14 }}>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={fieldStyle} /></label>
          <label style={{ display: "block", color: "#b9c2cb", fontSize: 11, marginBottom: 18 }}>Password<input required type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} style={fieldStyle} /></label>
          {error && <p role="alert" style={{ color: "#ff858a", fontSize: 12, lineHeight: 1.5 }}>{error}</p>}
          {message && <p role="status" style={{ color: "#76c9a1", fontSize: 12, lineHeight: 1.5 }}>{message}</p>}
          {search.get("setup") === "missing-env" && <p style={{ color: "#e6b966", fontSize: 12 }}>Vercel environment variables abhi configure nahi hue hain.</p>}
          {search.get("error") && <p style={{ color: "#ff858a", fontSize: 12 }}>Email verification ya workspace setup complete nahi hua. Dobara sign in try karo.</p>}
          <button disabled={busy} type="submit" style={{ width: "100%", padding: 13, border: "1px solid #ff777c", borderRadius: 6, background: "#e95860", color: "white", fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? .65 : 1 }}>{busy ? "Please wait…" : mode === "signin" ? "Sign in securely →" : "Create secure account →"}</button>
        </form>
        <p style={{ color: "#6f7c88", fontSize: 10, lineHeight: 1.6, marginTop: 20 }}>Protected by Supabase Auth and database Row Level Security. Agent execution remains disabled in this preview.</p>
      </section>
    </main>
  );
}

const fieldStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 7,
  padding: 12,
  color: "#f1f4f7",
  background: "#090d12",
  border: "1px solid #35404b",
  borderRadius: 6,
  outline: "none",
};
