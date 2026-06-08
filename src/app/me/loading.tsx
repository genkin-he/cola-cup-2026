import { Skeleton } from "../components/Skeleton";

export default function MeLoading() {
  return (
    <section>
      <div className="me">
        <h1 className="page-h disp">
          <Skeleton w={200} h={32} />
        </h1>
        <div className="who">
          <span className="em">
            <Skeleton w={40} h={40} radius={999} />
          </span>
          <span>
            <Skeleton w={120} h={20} />
            <Skeleton w={90} h={12} style={{ marginTop: 6 }} />
          </span>
        </div>
        <hr className="rule ink" style={{ marginTop: 18 }} />
        <div className="netlbl">
          <Skeleton w={80} h={12} />
        </div>
        <div className="huge">
          <Skeleton w={150} h={48} />
        </div>
        <p className="note">
          <Skeleton w="68%" h={12} />
        </p>
      </div>

      <div className="ledh disp">
        <Skeleton w={100} h={20} />
      </div>
      <hr className="rule" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i}>
          <div className="led">
            <Skeleton w={10} h={10} radius={999} />
            <span className="info">
              <Skeleton w="60%" h={15} />
              <Skeleton w="80%" h={11} style={{ marginTop: 6 }} />
            </span>
            <span className="d">
              <Skeleton w={40} h={16} />
            </span>
          </div>
          <hr className="rule" />
        </div>
      ))}
    </section>
  );
}
