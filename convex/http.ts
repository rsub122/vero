import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Mock ATS (KTD14). Public URL that writes to the database, so it fails closed on a shared secret.
http.route({
  path: "/ats/notes",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.ATS_SECRET;
    if (!secret || request.headers.get("X-ATS-Secret") !== secret) return new Response("Unauthorized", { status: 401 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    const { applicantId, note } = (body ?? {}) as { applicantId?: unknown; note?: unknown };
    if (typeof applicantId !== "string" || typeof note !== "string")
      return new Response("Bad request", { status: 400 });
    const ok = await ctx.runMutation(internal.handoff.recordAtsNote, { applicantId, note });
    return new Response(ok ? "Recorded" : "Not found", { status: ok ? 201 : 404 });
  }),
});

export default http;
