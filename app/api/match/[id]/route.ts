import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { ALL_MODELS } from "@/lib/engines/models";
import { consensusProbability } from "@/lib/engines/pipeline";
import { clamp, round } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET /api/match/[id] — dossier d'analyse complet d'une rencontre
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const store = getStore();
    const event = store.state.events.find(e => e.id === params.id);
    if (!event) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });

    const markets = store.state.markets.filter(m => m.eventId === event.id);
    const prediction = store.state.predictions.find(p => p.event.id === event.id) ?? null;

    // Analyse par modèle pour chaque marché (transparence)
    const analysis = markets.map(m => {
      const votes = {
        statistical: ALL_MODELS.statistical(event, m),
        form: ALL_MODELS.form(event, m),
        context: ALL_MODELS.context(event, m),
        matchup: ALL_MODELS.matchup(event, m),
        market: ALL_MODELS.market(event, m)
      };
      const modelProb = clamp(
        consensusProbability(votes, store.state.learning.modelWeights),
        0.02, 0.98
      );
      const ev = modelProb * m.odds - 1;
      return {
        market: m,
        votes: Object.fromEntries(Object.entries(votes).map(([k, v]) => [k, round(v, 3)])),
        modelProb: round(modelProb, 3),
        ev: round(ev, 4),
        isBest: prediction?.market.id === m.id
      };
    }).sort((a, b) => b.ev - a.ev);

    return NextResponse.json({
      event,
      prediction,
      analysis,
      learning: {
        modelWeights: store.state.learning.modelWeights,
        biasBySport: store.state.learning.biasBySport[event.sport] ?? 0
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
