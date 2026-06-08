import {
  getUserLedger,
  getUserNet,
  getUserCokeBreakdown,
} from "../../db/queries/ledger";
import { getCurrentUser } from "../../lib/identity";
import { bottlesToBuy, bottlesToReceive } from "../../lib/decimalOdds";
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
        <a
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
        </a>
      </section>
    );
  }

  const ledger = getUserLedger(user.id);
  const netRaw = getUserNet(user.id);
  const { pending_net } = getUserCokeBreakdown(user.id);
  const owe = bottlesToBuy(pending_net);
  const recv = bottlesToReceive(pending_net);

  const wins = ledger.filter((l) => l.won).length;
  const hugeClass =
    netRaw > 0 ? "huge" : netRaw < 0 ? "huge neg" : "huge zero";

  let verdictClass = "verdict";
  let verdictText = "";
  if (recv > 0) {
    verdictText = `可收 ${recv} 瓶可乐 · 差额进可乐池`;
  } else if (owe > 0) {
    verdictClass = "verdict neg";
    verdictText = `该买 ${owe} 瓶可乐 🥤 · 差额进可乐池`;
  } else if (ledger.length > 0) {
    verdictClass = "verdict zero";
    verdictText = "已结清";
  } else {
    verdictClass = "verdict zero";
    verdictText = "还没有投票记录";
  }

  return (
    <section>
      <div className="me">
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
        <div className={verdictClass}>{verdictText}</div>
        <p className="note">
          输家应买向上取整、赢家应收向下取整，差额进平台可乐池。结算以群众投票赔率为准。
        </p>
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
