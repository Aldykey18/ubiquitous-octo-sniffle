import { NextRequest, NextResponse } from "next/server";
import { ingestRealEvents } from "@/lib/store";

export const dynamic = "force-dynamic";

// POST /api/ingest — reçoit les VRAIES données collectées par le
// navigateur (API publique ESPN) et lance les calculs réels du moteur.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = Array.isArray(body?.events) ? body.events : [];
    if (!events.length) {
      return NextResponse.json({ ok: true, accepted: 0, note: "aucun événement transmis" });
    }
    const summary = ingestRealEvents(events.slice(0, 500), body?.reports ?? [], Boolean(body?.oddsFeedAvailable));
    return NextResponse.json({ ok: true, ...summary });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
