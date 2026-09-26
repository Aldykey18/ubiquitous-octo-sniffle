import { NextRequest, NextResponse } from "next/server";
import { getStore, setMode, resetData, getRejectedStats } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/admin — dashboard administrateur (état du moteur)
export async function GET() {
  try {
    const store = getStore();
    const s = store.state;
    return NextResponse.json({
      mode: s.mode,
      dateSeed: s.dateSeed,
      syncCount: s.syncCount,
      lastSync: s.lastSync,
      events: s.events.length,
      markets: s.markets.length,
      predictions: s.predictions.length,
      noBet: s.noBet,
      noBetReason: s.noBetReason,
      sources: s.sources,
      learning: s.learning,
      rejected: getRejectedStats(),
      topPrediction: s.predictions[0] ?? null,
      lastIngest: s.lastIngest ?? null,
      collectorReports: s.collectorReports ?? [],
      oddsFeedLive: Boolean(s.oddsFeedLive)
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}

// POST /api/admin { action: "setMode"|"reset", mode? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action === "setMode" && ["demo", "live"].includes(body.mode)) {
      setMode(body.mode);
      return NextResponse.json({ ok: true, mode: body.mode });
    }
    if (body?.action === "reset") {
      resetData();
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "action inconnue" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
