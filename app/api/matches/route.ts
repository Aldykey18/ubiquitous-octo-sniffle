import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/matches?sport=&status=
export async function GET(req: NextRequest) {
  try {
    const store = getStore();
    const sp = req.nextUrl.searchParams;
    const sport = sp.get("sport");
    const status = sp.get("status");

    let events = [...store.state.events];
    if (sport && sport !== "all") events = events.filter(e => e.sport === sport);
    if (status && status !== "all") events = events.filter(e => e.status === status);
    events.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const hasPrediction = new Set(store.state.predictions.map(p => p.event.id));

    return NextResponse.json({
      events: events.map(e => ({
        ...e,
        hasBestBet: hasPrediction.has(e.id),
        marketCount: store.state.markets.filter(m => m.eventId === e.id).length
      })),
      count: events.length,
      lastSync: store.state.lastSync
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
