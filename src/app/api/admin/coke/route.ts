import { NextResponse } from "next/server";
import { getCurrentSettler } from "../../../../lib/settler";
import { markCokeSettled } from "../../../../lib/settlement";

export async function POST(request: Request) {
  const settler = await getCurrentSettler();
  if (!settler) {
    return NextResponse.json({ error: "无结算权限" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    matchId?: number;
    settled?: boolean;
  } | null;

  const matchId = Number(body?.matchId);
  if (!Number.isFinite(matchId)) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }

  const outcome = markCokeSettled(matchId, settler.id, body?.settled !== false);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
