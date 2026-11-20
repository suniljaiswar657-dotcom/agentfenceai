# AGENTFENCE AI

**Control Every Agent. Trust Every Action.**

An AI-agent governance and security control-plane concept. Current repository contains a frontend preview with local sample data.

## Current preview
- Security command-center dashboard
- Agent registration (new demo agents start paused with zero permissions)
- Demo pause/resume controls
- Human approval queue with approve/deny interactions
- Activity log and policy templates
- Responsive dark interface

## Scope and safety
This UI is **not connected to real agents**. Its controls update local browser state only; they do not execute external actions or enforce production security. Do not use this preview to protect live systems.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## First backend slice: policy decision API

A server-side policy evaluation endpoint is available at `POST /api/policy/decision`.

Example request:
```json
{ "agentId": "agent_demo_support", "action": "ticket.read" }
```

Supported demo agent IDs: `agent_demo_support`, `agent_demo_analyst`, and `agent_demo_outbound`.
Supported actions: `ticket.read`, `crm.read`, `email.send`, and `customer.export`.
Unknown agents, unknown actions, and missing scopes are denied. Email sending and customer exports return `approval_required`. The API never authorizes execution (`executionAuthorized: false`).

**Important:** this is an initial policy-engine slice with a hard-coded demo registry. It has no authentication, tenant isolation, database persistence, approval verification, or execution gateway. Do not connect it to live agents or treat it as production security.

## Planned architecture
- Next.js operator console
- FastAPI policy decision and audit service
- PostgreSQL/Supabase for tenant-scoped persistence and identity
- Server-enforced RBAC, least privilege and deny-by-default policies
- Exact-action, expiring human approvals for high-impact operations
- Append-only audit events, rate limits and cost ceilings

## Security principles
- Default deny; unknown tools and actions are not permitted.
- The model never authorizes itself; deterministic server-side policy enforcement is authoritative.
- High-impact or irreversible actions require explicit, action-bound human approval.
- Approval is not execution: the execution gateway independently re-checks identity, scope, expiry and replay protection.
- Fail closed if policy, approval validation or audit persistence fails.
- Never commit secrets; use environment variables and rotate exposed credentials.

## Roadmap
1. Frontend preview (current)
2. Backend policy engine and API contracts
3. Authentication and tenant isolation
4. Persistent agent registry, policies, approvals and audit log
5. Integration adapters and security test suite
6. Billing and production hardening
