import { NextResponse } from "next/server";
import { getCurrentSettler } from "../../../../lib/settler";
import { markAllCokeSettled } from "../../../../lib/settlement";

export async function POST() {
  const settler = await getCurrentSettler();
  if (!settler) {
    return NextResponse.json({ error: "无结算权限" }, { status: 403 });
  }
  const outcome = markAllCokeSettled(settler.id);
  return NextResponse.json({ ok: true, settled: outcome.settled });
}
