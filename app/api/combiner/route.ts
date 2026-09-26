import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { buildCombiner } from "@/lib/engines/combiner";
import { globalCorrelationRisk } from "@/lib/engines/correlation";

export const dynamic = "force-dynamic";

// POST /api/combiner { strategy: "conservative"|"balanced"|"highValue", bankroll }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const strategy = ["conservative", "balanced", "highValue"].includes(body?.strategy)
      ? body.strategy
      : "balanced";
    const bankroll = Number(body?.bankroll ?? 100000);
    const store = getStore();
    const result = buildCombiner(store.state.predictions, { strategy, bankroll });
    return NextResponse.json({
      ...result,
      correlationRisk: globalCorrelationRisk(result.selections)
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
