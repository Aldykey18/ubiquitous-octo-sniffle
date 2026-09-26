import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { globalCorrelationRisk } from "@/lib/engines/correlation";

export const dynamic = "force-dynamic";

// GET /api/predictions?sport=&risk=&tier=&status=&minConf=&minEv=
export async function GET(req: NextRequest) {
  try {
    const store = getStore();
    const sp = req.nextUrl.searchParams;
    const sport = sp.get("sport");
    const risk = sp.get("risk");
    const tier = sp.get("tier");
    const status = sp.get("status"); // today | live | upcoming
    const minConf = Number(sp.get("minConf") ?? 0);
    const minEv = Number(sp.get("minEv") ?? 0) / 100;

    let list = [...store.state.predictions];

    if (sport && sport !== "all") list = list.filter(p => p.event.sport === sport);
    if (risk && risk !== "all") {
      if (risk === "premium") list = list.filter(p => p.confidenceTier === "PREMIUM");
      else if (risk === "highValue") list = list.filter(p => p.ev >= 0.08);
      else list = list.filter(p => p.risk.toLowerCase() === risk);
    }
    if (tier && tier !== "all") list = list.filter(p => p.confidenceTier === tier.toUpperCase());
    if (status === "live") list = list.filter(p => p.event.status === "live");
    if (status === "upcoming") list = list.filter(p => p.event.status === "upcoming");
    if (minConf) list = list.filter(p => p.confidence >= minConf);
    if (minEv) list = list.filter(p => p.ev >= minEv);

    const filtered = sp.get("sport") || sp.get("risk") || sp.get("tier") || status || minConf || minEv;

    return NextResponse.json({
      predictions: list,
      noBet: list.length === 0,
      noBetReason: store.state.noBetReason ??
        "Aucun marché ne présente actuellement un avantage statistique suffisamment robuste. Le moteur recommande d'attendre de nouvelles données ou mouvements de marché.",
      correlationRisk: globalCorrelationRisk(list),
      generatedAt: store.state.lastSync,
      max: 10,
      totalCandidatesAnalyzed: store.state.markets.length,
      isFiltered: Boolean(filtered)
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
