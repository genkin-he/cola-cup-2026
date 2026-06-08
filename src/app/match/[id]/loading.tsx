import { Skeleton } from "../../components/Skeleton";

export default function MatchLoading() {
  return (
    <section>
      <div className="detail-head">
        <Skeleton w={88} h={18} />
        <Skeleton w={120} h={14} />
        <Skeleton w={56} h={22} radius={999} />
      </div>
      <hr className="rule" />

      <div className="detail-vs">
        <span className="team">
          <span className="flag">
            <Skeleton w={44} h={44} radius={8} />
          </span>
          <span className="nm">
            <Skeleton w={80} h={18} style={{ marginTop: 8 }} />
          </span>
        </span>
        <span className="x">
          <Skeleton w={36} h={28} />
        </span>
        <span className="team">
          <span className="flag">
            <Skeleton w={44} h={44} radius={8} />
          </span>
          <span className="nm">
            <Skeleton w={80} h={18} style={{ marginTop: 8 }} />
          </span>
        </span>
      </div>

      <div className="detail-when">
        <Skeleton w={220} h={13} />
      </div>
      <hr className="rule" />

      <div className="detail-cols">
        <div className="left">
          <Skeleton w="100%" h={170} radius={10} />
        </div>
        <div className="right">
          <Skeleton w="100%" h={210} radius={10} />
        </div>
      </div>
    </section>
  );
}
