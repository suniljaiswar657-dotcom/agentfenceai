export type AgentAction = "ticket.read" | "crm.read" | "email.send" | "customer.export";
type AgentRecord = { scopes: readonly string[] };
const POLICY_VERSION = "2026-11-20.1";
// Temporary server-side demo registry. Replace with authenticated, tenant-scoped database records before connecting real agents.
const DEMO_AGENTS: Record<string, AgentRecord> = {
  agent_demo_support: { scopes: ["tickets:read"] },
  agent_demo_analyst: { scopes: ["crm:read"] },
  agent_demo_outbound: { scopes: ["email:send"] },
};
type ActionPolicy = { requiredScope: string; approvalRequired: boolean; risk: "low" | "medium" | "high" | "critical" };
const ACTION_POLICIES: Record<AgentAction, ActionPolicy> = {
  "ticket.read": { requiredScope: "tickets:read", approvalRequired: false, risk: "low" },
  "crm.read": { requiredScope: "crm:read", approvalRequired: false, risk: "medium" },
  "email.send": { requiredScope: "email:send", approvalRequired: true, risk: "high" },
  "customer.export": { requiredScope: "customers:export", approvalRequired: true, risk: "critical" },
};
export type PolicyDecision = { decision: "allow" | "deny" | "approval_required"; reason: string; policyVersion: string; risk: "low" | "medium" | "high" | "critical" | "unknown"; executionAuthorized: false };
export function evaluatePolicy(input: { agentId: string; action: string }): PolicyDecision {
  const base = { policyVersion: POLICY_VERSION, executionAuthorized: false as const };
  const agent = DEMO_AGENTS[input.agentId];
  if (!agent) return { ...base, decision: "deny", reason: "Unknown agent. Default-deny policy applied.", risk: "unknown" };
  if (!Object.prototype.hasOwnProperty.call(ACTION_POLICIES, input.action)) return { ...base, decision: "deny", reason: "Unknown action. No policy grants this action.", risk: "unknown" };
  const policy = ACTION_POLICIES[input.action as AgentAction];
  if (!agent.scopes.includes(policy.requiredScope)) return { ...base, decision: "deny", reason: "Missing required scope: " + policy.requiredScope + ".", risk: policy.risk };
  if (policy.approvalRequired) return { ...base, decision: "approval_required", reason: "This high-impact action requires a separate human approval workflow.", risk: policy.risk };
  return { ...base, decision: "allow", reason: "Agent scope matches the explicit policy for this action.", risk: policy.risk };
}
