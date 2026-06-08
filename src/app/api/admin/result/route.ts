import { NextResponse } from "next/server";
import { isAdminToken } from "../../../../lib/admin";
import { settleMatch } from "../../../../lib/settlement";
import type { Pick } from "../../../../lib/stage";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    adminToken?: string;
    matchId?: number;
    result?: Pick;
    homeScore?: number;
    awayScore?: number;
  } | null;

  if (!isAdminToken(body?.adminToken)) {
    return NextResponse.json({ error: "管理员口令错误" }, { status: 401 });
  }

  const matchId = Number(body?.matchId);
  const result = body?.result;
  if (!Number.isFinite(matchId) || !result) {
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

  const outcome = settleMatch(matchId, result, homeScore, awayScore);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true, settled: outcome.settled });
}
