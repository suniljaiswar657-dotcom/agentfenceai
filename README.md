# AGENTFENCE AI

**Control Every Agent. Trust Every Action.**

An AI-agent governance control plane with a Next.js operator console, Supabase Auth, tenant-scoped PostgreSQL data, deterministic policy checks, and human approval foundations.

## Current capabilities

- Responsive security command-center preview
- Supabase email/password sign-up and sign-in
- Cookie-based server-side sessions using `@supabase/ssr`
- Protected application routes and sign-out
- Workspace creation and owner membership through a server-validated database function
- Tenant-scoped tables for agents, policies, approvals and audit events
- Row Level Security enabled on every application table
- Approval review RPC prevents requesters from approving their own requests
- Demo policy decision API with deny-by-default behavior

## Supabase setup

Set these Vercel environment variables for Production, Preview and Development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Use the project's publishable key only. Never add a Supabase secret or service-role key to a `NEXT_PUBLIC_` variable or browser code.

In Supabase Dashboard → Authentication → URL Configuration, set:

- Site URL: `https://agentfenceai.vercel.app`
- Redirect URL: `https://agentfenceai.vercel.app/auth/callback`
- Local development redirect: `http://localhost:3000/auth/callback`

If email confirmation is enabled, users must verify their email before the workspace is created. Configure SMTP and email templates before inviting real customers.

## Database model

- `organizations` — tenant workspaces
- `organization_members` — owner/admin/member membership
- `agents` — tenant-owned agent registry and allowed scopes
- `policies` — tenant-owned policy rules
- `approvals` — pending, approved and rejected requests
- `audit_logs` — append-only application audit events

All six tables have RLS enabled. Membership checks are performed in database policies; clients must never supply a trusted tenant identity without membership validation.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Policy decision test bench

Open `/policy-test` after signing in. The demo policy endpoint supports:

- `agent_demo_support`
- `agent_demo_analyst`
- `agent_demo_outbound`
- `ticket.read`, `crm.read`, `email.send`, `customer.export`

Unknown agents/actions and missing scopes are denied. High-impact demo actions return `approval_required`. The endpoint always returns `executionAuthorized: false`.

## Important security boundary

This is an early secure-auth and persistence foundation, **not a production agent execution platform**.

- The dashboard's agent fleet, queue and activity panels still use local sample data.
- The policy decision endpoint still uses a hard-coded demo registry; it is not yet connected to tenant policies.
- The approval database workflow does not execute external actions.
- No live agent connectors, billing, production rate limits, or full audit coverage are enabled.
- Do not connect live agents or send real customer data until the execution gateway, tenant-aware API layer, security tests and operational controls are complete.

## Security principles

- Default deny; unknown tools and actions are not permitted.
- RLS is enabled on every tenant data table.
- The model never authorizes itself; deterministic server-side policy enforcement is authoritative.
- High-impact actions require separate human review; a requester cannot approve their own request.
- Approval is not execution. A future execution gateway must independently re-check identity, scope, approval expiry and replay protection.
- Fail closed if policy, approval validation or audit persistence fails.
- Never commit secrets; use environment variables and rotate exposed credentials.

## Roadmap

1. Dashboard preview and demo policy engine
2. Supabase Auth and protected sessions
3. Tenant-scoped persistent database with RLS
4. Connect dashboard CRUD to authenticated tenant data
5. Persist policy decisions and complete audit coverage
6. Security test suite, rate limits and controlled execution gateway
7. Billing and production hardening
