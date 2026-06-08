import { Skeleton } from "../components/Skeleton";

export default function AdminLoading() {
  return (
    <section>
      <div className="adm-head">
        <h1>
          <Skeleton w={200} h={28} />
        </h1>
        <p>
          <Skeleton w="85%" h={13} style={{ marginTop: 8 }} />
        </p>
      </div>
      <hr className="rule ink" />
      <div className="subtabs">
        <Skeleton w={72} h={30} radius={999} />
        <Skeleton w={88} h={30} radius={999} />
      </div>
      <hr className="rule" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i}>
          <div className="led">
            <Skeleton w={20} h={20} radius={4} />
            <span className="info">
              <Skeleton w="55%" h={15} />
              <Skeleton w="35%" h={11} style={{ marginTop: 6 }} />
            </span>
            <Skeleton w={48} h={16} />
          </div>
          <hr className="rule" />
        </div>
      ))}
    </section>
  );
}
