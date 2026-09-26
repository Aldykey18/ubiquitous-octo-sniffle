import { NextResponse } from "next/server";
import { forceSync, getStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

// POST /api/sync — déclenche une synchronisation manuelle immédiate
export async function POST() {
  try {
    await forceSync();
    return NextResponse.json({ ok: true, status: getStatus() });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
