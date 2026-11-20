"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import { createClient } from "@/lib/supabase/client";

type Agent = {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "revoked";
  allowed_scopes: string[];
  created_at: string;
};
type Approval = {
  id: string;
  action_name: string;
  status: string;
  created_at: string;
  request_payload: Record<string, unknown>;
  agents: { name: string } | null;
};
type AuditEvent = {
  id: string;
  event_type: string;
  resource_type: string;
  details: Record<string, unknown>;
  created_at: string;
};

const supabase = createClient();
const nav = ["Overview", "Agents", "Approvals", "Activity log", "Policies"];

export default function Home() {
  const [tab, setTab] = useState("Agents");
  const [organizationId, setOrganizationId] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [policyCount, setPolicyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Session expired. Please sign in again.");

      const { data: memberships, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", authData.user.id)
        .limit(1);
      if (memberError) throw memberError;
      const orgId = memberships?.[0]?.organization_id;
      if (!orgId) throw new Error("No workspace is linked to this account. Sign out and sign in again.");
      setOrganizationId(orgId);

      const [agentResult, approvalResult, eventResult, policyResult] = await Promise.all([
        supabase.from("agents").select("id,name,description,status,allowed_scopes,created_at").eq("organization_id", orgId).order("created_at", { ascending: false }),
        supabase.from("approvals").select("id,action_name,status,created_at,request_payload,agents(name)").eq("organization_id", orgId).eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("audit_logs").select("id,event_type,resource_type,details,created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(30),
        supabase.from("policies").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      ]);
      if (agentResult.error) throw agentResult.error;
      if (approvalResult.error) throw approvalResult.error;
      if (eventResult.error) throw eventResult.error;
      if (policyResult.error) throw policyResult.error;
      setAgents((agentResult.data || []) as Agent[]);
      setApprovals((approvalResult.data || []) as unknown as Approval[]);
      setEvents((eventResult.data || []) as AuditEvent[]);
      setPolicyCount(policyResult.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workspace data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  const filtered = useMemo(
    () => agents.filter((agent) => (agent.name + " " + agent.description).toLowerCase().includes(search.toLowerCase())),
    [agents, search]
  );
  const activeCount = agents.filter((agent) => agent.status === "active").length;

  async function writeAudit(eventType: string, resourceId: string, details: Record<string, unknown>) {
    if (!organizationId) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { error: auditError } = await supabase.from("audit_logs").insert({
      organization_id: organizationId,
      actor_user_id: data.user.id,
      event_type: eventType,
      resource_type: "agent",
      resource_id: resourceId,
      details,
    });
    if (auditError) setMessage("Change saved; audit event could not be written: " + auditError.message);
  }

  async function addAgent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !name.trim()) return;
    setBusyId("new");
    setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Please sign in again.");
      const { data, error: insertError } = await supabase.from("agents").insert({
        organization_id: organizationId,
        created_by: authData.user.id,
        name: name.trim(),
        description: description.trim(),
        status: "paused",
        allowed_scopes: [],
      }).select("id").single();
      if (insertError) throw insertError;
      await writeAudit("agent.created", data.id, { name: name.trim(), status: "paused", allowed_scopes: [] });
      setName("");
      setDescription("");
      setModal(false);
      setMessage("Agent saved to your workspace in PAUSED state with zero permissions.");
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent could not be created.");
    } finally {
      setBusyId("");
    }
  }

  async function toggleAgent(agent: Agent) {
    const nextStatus = agent.status === "active" ? "paused" : "active";
    setBusyId(agent.id);
    setError("");
    try {
      const { error: updateError } = await supabase.from("agents")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", agent.id)
        .eq("organization_id", organizationId);
      if (updateError) throw updateError;
      await writeAudit(nextStatus === "active" ? "agent.enabled" : "agent.paused", agent.id, { name: agent.name, status: nextStatus });
      setMessage(agent.name + " status saved as " + nextStatus.toUpperCase() + ".");
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent status could not be changed.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="app">
      <aside className="sidebar">
        <a className="brand" href="#"><b>⬡</b><span>AGENTFENCE<em>AI</em><small>AGENT GOVERNANCE</small></span></a>
        <div className="workspace">● &nbsp; YOUR WORKSPACE <span>⌄</span></div>
        <label className="navlabel">WORKSPACE</label>
        <nav>{nav.map((item, index) => <button key={item} onClick={() => setTab(item)} className={tab === item ? "selected" : ""}><span className="glyph">{["▦", "◈", "⌑", "⌁", "⬡"][index]}</span>{item}{item === "Approvals" && approvals.length > 0 && <b className="count">{approvals.length}</b>}</button>)}</nav>
        <div className="sidebottom"><div className="sidecard"><b>Security posture</b><p>Agents begin paused with zero permissions.</p><small>● DATABASE CONNECTED</small></div><div className="profile"><b>AF</b><span>Workspace member<small>Authenticated session</small></span></div></div>
      </aside>
      <section className="main">
        <header><span>Workspace <i>/</i> <b>{tab}</b></span><div><label className="demo">● LIVE DATA</label><LogoutButton/><b className="user">AF</b></div></header>
        <div className="content">
          <div className="heading"><div><small className="eyebrow">AGENT GOVERNANCE · SECURE WORKSPACE</small><h1>{tab === "Overview" ? "Command center" : tab}</h1><p>Manage your registered agents, permissions, and governance records.</p></div>{(tab === "Agents" || tab === "Overview") && <button className="primary" onClick={() => setModal(true)}>＋ Add agent</button>}</div>
          <div className="notice"><b>i</b><span><strong>Governance preview.</strong> Agent records, approvals, policies and audit events are loaded from your Supabase workspace. Agent execution and external tool connections are not enabled.</span></div>
          {error && <div className="notice" role="alert"><b>!</b><span>{error}</span></div>}
          {message && <div className="notice"><b>✓</b><span>{message}</span></div>}
          {loading ? <section className="panel full"><p>Loading secure workspace data…</p></section> : <>
            {(tab === "Overview" || tab === "Agents") && tab === "Overview" && <div className="stats">
              {[[ "REGISTERED AGENTS", agents.length, "Saved in this workspace", "◈" ],[ "ENABLED AGENTS", activeCount, "Execution connector not enabled", "⌁" ],[ "PENDING APPROVALS", approvals.length, "Waiting for review", "◷" ],[ "ACTIVE POLICIES", policyCount, "Stored governance rules", "⬡" ]].map(([label, value, foot, icon], index) => <article className="stat" key={String(label)}><div>{label}<b className={"staticon s" + index}>{icon}</b></div><strong>{String(value).padStart(2, "0")}</strong><small>{foot}</small></article>)}
            </div>}
            {(tab === "Agents" || tab === "Overview") && <section className="panel full">
              <div className="panelhead"><div><h2>{tab === "Overview" ? "Agent fleet" : "All agents"}</h2><p>New agents are stored paused with zero permissions.</p></div><input className="search" placeholder="Search agents…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
              {filtered.map(agent => <div className="agentrow" key={agent.id}><b className="agenticon">{agent.name.charAt(0).toUpperCase()}</b><span className="agentname"><strong>{agent.name}</strong><small>{agent.description || "No description"} · {(agent.allowed_scopes || []).length} permissions</small></span><label className={agent.status === "active" ? "live" : "paused"}>● {agent.status}</label><i className="risk low">{agent.status === "revoked" ? "Revoked" : "Zero-scope default"}</i><button className="mini" disabled={busyId === agent.id || agent.status === "revoked"} onClick={() => void toggleAgent(agent)}>{busyId === agent.id ? "Saving…" : agent.status === "active" ? "Pause" : "Enable"}</button></div>)}
              {!filtered.length && <div className="empty">{agents.length ? "No agents match your search." : "No agents yet. Add your first agent to this workspace."}</div>}
            </section>}
            {tab === "Approvals" && <section className="panel full"><div className="panelhead"><div><h2>Human approval queue</h2><p>Pending requests stored in your workspace.</p></div><label className="demo">{approvals.length} PENDING</label></div>{approvals.map(item => <div className="approval expanded" key={item.id}><div><strong>{item.action_name}</strong><i className="risk high">Pending</i></div><p>{item.agents?.name || "Unknown agent"} · {JSON.stringify(item.request_payload || {})}</p><footer><small>{new Date(item.created_at).toLocaleString()}</small></footer></div>)}{!approvals.length && <div className="empty">No pending approvals in this workspace.</div>}</section>}
            {tab === "Activity log" && <section className="panel full"><div className="panelhead"><div><h2>Audit activity</h2><p>Persistent audit events from your workspace.</p></div><label className="demo">LIVE AUDIT</label></div><table><thead><tr><th>TIME</th><th>EVENT</th><th>RESOURCE</th><th>DETAILS</th></tr></thead><tbody>{events.map(event => <tr key={event.id}><td>{new Date(event.created_at).toLocaleString()}</td><td>{event.event_type}</td><td>{event.resource_type}</td><td>{JSON.stringify(event.details)}</td></tr>)}</tbody></table>{!events.length && <div className="empty">No audit events recorded yet.</div>}</section>}
            {tab === "Policies" && <section className="panel full"><div className="panelhead"><div><h2>Governance policies</h2><p>Policies configured for this workspace.</p></div><label className="demo">{policyCount} STORED</label></div><p className="empty">{policyCount ? "Policy records exist in the database. Policy editor and enforcement integration are the next build stage." : "No policies have been created yet. Policy authoring is the next build stage."}</p></section>}
          </>}
          <footer className="foot"><span>© 2026 AGENTFENCE AI</span><span>BUILT FOR CONTROL · DESIGNED FOR TRUST</span><small>● Supabase-backed workspace · Agent execution disabled</small></footer>
        </div>
      </section>
      {modal && <div className="overlay" onClick={() => setModal(false)}><section className="modal" onClick={event => event.stopPropagation()}><button className="close" onClick={() => setModal(false)}>×</button><small>NEW REGISTRATION</small><h2>Register an agent</h2><p>This creates a real database record. It starts paused with no permissions.</p><form onSubmit={addAgent}><label>Agent name</label><input required minLength={1} maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Research Assistant" /><label>Description</label><input maxLength={500} value={description} onChange={event => setDescription(event.target.value)} placeholder="What will this agent do?" /><p className="safe">🔒 Safe default: PAUSED · ZERO PERMISSIONS</p><button className="primary submit" disabled={busyId === "new"} type="submit">{busyId === "new" ? "Saving…" : "Save agent →"}</button></form></section></div>}
    </main>
  );
}
