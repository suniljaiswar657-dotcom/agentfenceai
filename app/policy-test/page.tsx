"use client";

import { useState } from "react";

type Result = { status: number; body: unknown } | { error: string };

const cases = [
  { title: "Allowed · ticket.read", agentId: "agent_demo_support", action: "ticket.read", expected: "allow" },
  { title: "Approval required · email.send", agentId: "agent_demo_outbound", action: "email.send", expected: "approval_required" },
  { title: "Denied · unauthorized export", agentId: "agent_demo_support", action: "customer.export", expected: "deny" },
  { title: "Denied · unknown agent", agentId: "agent_unknown", action: "ticket.read", expected: "deny" },
];

export default function PolicyTestPage() {
  const [results, setResults] = useState<Record<number, Result>>({});
  const [running, setRunning] = useState<number | null>(null);

  async function runTest(index: number) {
    setRunning(index);
    try {
      const response = await fetch("/api/policy/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: cases[index].agentId, action: cases[index].action }),
      });
      const body = await response.json();
      setResults((old) => ({ ...old, [index]: { status: response.status, body } }));
    } catch (error) {
      setResults((old) => ({ ...old, [index]: { error: error instanceof Error ? error.message : "Request failed" } }));
    } finally {
      setRunning(null);
    }
  }

  async function runAll() {
    for (let i = 0; i < cases.length; i += 1) await runTest(i);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#090c10", color: "#f1f4f7", padding: "32px 18px", fontFamily: "Arial, sans-serif" }}>
      <section style={{ maxWidth: 820, margin: "0 auto" }}>
        <a href="/" style={{ color: "#f17b80", textDecoration: "none", fontSize: 13 }}>← Back to dashboard</a>
        <p style={{ color: "#8e9aa6", fontSize: 11, letterSpacing: 2, marginTop: 30 }}>AGENTFENCE AI · DEVELOPER CHECK</p>
        <h1 style={{ fontSize: 30, margin: "8px 0" }}>Policy API test bench</h1>
        <p style={{ color: "#9aa5b0", lineHeight: 1.6, fontSize: 14 }}>Run real POST requests against this deployment. These checks only evaluate policy decisions; they do not execute agent actions.</p>
        <button onClick={runAll} disabled={running !== null} style={{ background: "#e95860", color: "white", border: 0, borderRadius: 6, padding: "12px 16px", margin: "18px 0", fontWeight: 700 }}>
          {running !== null ? "Running test…" : "Run all 4 tests"}
        </button>
        <div style={{ display: "grid", gap: 12 }}>
          {cases.map((test, index) => {
            const result = results[index];
            const passed = result && "body" in result && (result.body as { decision?: string }).decision === test.expected;
            return (
              <article key={test.title} style={{ border: "1px solid #29323c", borderRadius: 8, padding: 16, background: "#11161c" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <strong>{test.title}</strong>
                  <button onClick={() => runTest(index)} disabled={running !== null} style={{ background: "#222b35", color: "#e8edf2", border: "1px solid #3a4652", borderRadius: 5, padding: "7px 10px" }}>
                    {running === index ? "Running…" : "Run test"}
                  </button>
                </div>
                <p style={{ color: "#8e9aa6", fontSize: 12, marginBottom: 8 }}>Expected decision: <code>{test.expected}</code></p>
                {result && (
                  <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: "#090d12", borderRadius: 6, padding: 12, color: "#cbd5df", fontSize: 11, lineHeight: 1.5 }}>
                    {"error" in result ? result.error : JSON.stringify({ httpStatus: result.status, ...((result.body && typeof result.body === "object") ? result.body : { response: result.body }), testPassed: passed }, null, 2)}
                  </pre>
                )}
              </article>
            );
          })}
        </div>
        <p style={{ color: "#788592", fontSize: 11, lineHeight: 1.6, marginTop: 22 }}>Demo-only test utility. The API currently has no authentication or tenant isolation. Do not connect live agents or send real customer data.</p>
      </section>
    </main>
  );
}
