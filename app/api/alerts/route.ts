import { NextRequest, NextResponse } from "next/server";
import { getStore, markAlertsRead } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/alerts — liste des alertes intelligentes
export async function GET() {
  try {
    const store = getStore();
    return NextResponse.json({
      alerts: store.state.alerts,
      unread: store.state.alerts.filter(a => !a.read).length
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}

// POST /api/alerts { readAll: true } — marque tout comme lu
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.readAll) markAlertsRead();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
