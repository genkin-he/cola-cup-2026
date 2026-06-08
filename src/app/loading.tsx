import { Skeleton } from "./components/Skeleton";

export default function HomeLoading() {
  return (
    <section>
      <div className="masthead">
        <h1 className="headline disp">
          <Skeleton w="60%" h={40} />
          <Skeleton w="42%" h={40} style={{ marginTop: 10 }} />
        </h1>
        <p className="tagline">
          <Skeleton w="78%" h={13} />
        </p>
      </div>
      <hr className="rule ink" />
      <div className="subtabs">
        {["all", "open", "done"].map((key) => (
          <Skeleton key={key} w={60} h={28} radius={999} />
        ))}
      </div>
      <hr className="rule" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i}>
          <div className="mrow no-link">
            <Skeleton w={52} h={36} />
            <Skeleton h={20} style={{ flex: 1, margin: "0 14px" }} />
            <Skeleton w={56} h={36} />
          </div>
          <hr className="rule" />
        </div>
      ))}
    </section>
  );
}
