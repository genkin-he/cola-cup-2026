import { Skeleton } from "../components/Skeleton";

export default function LeaderboardLoading() {
  return (
    <section>
      <div className="lbh">
        <h1 className="disp">
          <Skeleton w={180} h={34} />
        </h1>
        <div className="sub">
          <Skeleton w={120} h={12} style={{ marginTop: 8 }} />
        </div>
      </div>
      <hr className="rule ink" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i}>
          <div className="lr">
            <span className="rk">
              <Skeleton w={18} h={18} />
            </span>
            <span className="em">
              <Skeleton w={26} h={26} radius={999} />
            </span>
            <span className="who">
              <Skeleton w={120} h={16} />
              <Skeleton w={80} h={11} style={{ marginTop: 6 }} />
            </span>
            <span className="n">
              <Skeleton w={48} h={18} />
            </span>
          </div>
          <hr className="rule" />
        </div>
      ))}
    </section>
  );
}
