import Link from "next/link";
import { getUserLedger, getUserNet } from "../../db/queries/ledger";
import { getCurrentUser } from "../../lib/identity";
import { formatBottles } from "../../lib/format";
import { PICK_LABELS, stageLabel, type Pick } from "../../lib/stage";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="id-page">
        <h1 className="disp">
          还没有<br />
          <em>身份</em> 👤
        </h1>
        <p className="lead">登录后才能查看你的可乐账本。</p>
        <Link
          href="/identity"
          className="cta"
          style={{
            display: "inline-block",
            textAlign: "center",
            marginTop: 24,
            padding: "14px 28px",
          }}
        >
          🥤 设置身份
        </Link>
      </section>
    );
  }

  const ledger = getUserLedger(user.id);
  const netRaw = getUserNet(user.id);
  const wins = ledger.filter((l) => l.won).length;
  const hugeClass =
    netRaw > 0 ? "huge" : netRaw < 0 ? "huge neg" : "huge zero";

  return (
    <section>
      <div className="me">
        <h1 className="page-h disp">我的账本 🥤</h1>
        <div className="who">
          <span className="em">{user.emoji ?? "👤"}</span>
          <span>
            <div className="nm disp">{user.nickname}</div>
            <div className="tag">
              参与 {ledger.length} 场 · 猜中 {wins}
            </div>
          </span>
        </div>
        <hr className="rule ink" style={{ marginTop: 18 }} />
        <div className="netlbl">累计净瓶数</div>
        <div className={hugeClass}>
          {formatBottles(netRaw)}
          <small> 瓶</small>
        </div>
        <p className="note">按同事预测赔率结算，每场比赛的输赢见下。</p>
      </div>

      <div className="ledh disp">结算明细</div>
      <hr className="rule" />
      {ledger.length === 0 ? (
        <p
          style={{
            padding: "32px 0",
            textAlign: "center",
            color: "var(--low)",
            fontSize: 13,
          }}
        >
          还没有已结算的投注
        </p>
      ) : (
        <>
          {ledger.map((row) => (
            <div key={row.id}>
              <div className="led">
                <span className={`dot ${row.won === 1 ? "w" : "l"}`}></span>
                <span className="info">
                  <div className="t">
                    {row.home_flag ?? ""} {row.home_name} vs {row.away_name}{" "}
                    {row.away_flag ?? ""}
                  </div>
                  <div className="m">
                    {stageLabel(row.stage)} · 看好 {PICK_LABELS[row.pick as Pick]} ·{" "}
                    {row.stake} 瓶 · 赔率 {row.d_used.toFixed(2)}
                  </div>
                </span>
                <span className={`d ${row.delta >= 0 ? "pos" : "neg"}`}>
                  {formatBottles(row.delta)}
                </span>
              </div>
              <hr className="rule" />
            </div>
          ))}
        </>
      )}
    </section>
  );
}
