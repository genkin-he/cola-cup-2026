import { NextResponse } from "next/server";
import { getCurrentSettler } from "../../../../lib/settler";
import { updateMatchScore } from "../../../../lib/settlement";

export async function POST(request: Request) {
  const settler = await getCurrentSettler();
  if (!settler) {
    return NextResponse.json({ error: "无结算权限" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    matchId?: number;
    homeScore?: number | null;
    awayScore?: number | null;
  } | null;

  const matchId = Number(body?.matchId);
  if (!Number.isFinite(matchId)) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }

  const homeScore =
    body?.homeScore == null || body.homeScore === ("" as never)
      ? null
      : Number(body.homeScore);
  const awayScore =
    body?.awayScore == null || body.awayScore === ("" as never)
      ? null
      : Number(body.awayScore);

  const outcome = updateMatchScore(matchId, homeScore, awayScore);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
