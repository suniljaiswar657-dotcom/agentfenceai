import { evaluatePolicy } from "@/lib/policy";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (typeof body !== "object" || body === null || !("agentId" in body) || !("action" in body) || typeof body.agentId !== "string" || typeof body.action !== "string" || body.agentId.length < 1 || body.agentId.length > 100 || body.action.length < 1 || body.action.length > 100) {
    return Response.json({ error: "Expected non-empty string fields: agentId and action." }, { status: 400 });
  }
  const result = evaluatePolicy({ agentId: body.agentId, action: body.action });
  return Response.json(result, { status: result.decision === "deny" ? 403 : 200, headers: { "Cache-Control": "no-store" } });
}
