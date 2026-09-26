import { NextResponse } from "next/server";
import { getBacktestReport, getBacktestRecords } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/backtest — rapport complet (accuracy, ROI, Brier, calibration…)
export async function GET() {
  try {
    return NextResponse.json({
      report: getBacktestReport(),
      recentRecords: getBacktestRecords(40)
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
