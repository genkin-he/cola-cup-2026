import { Skeleton } from "../components/Skeleton";

export default function IdentityLoading() {
  return (
    <section className="id-page">
      <h1 className="disp">
        <Skeleton w={140} h={36} />
        <Skeleton w={180} h={36} style={{ marginTop: 8 }} />
      </h1>
      <p className="lead">
        <Skeleton w="72%" h={14} />
      </p>
      <div style={{ paddingTop: 28, display: "grid", gap: 16, maxWidth: 360 }}>
        <Skeleton w={72} h={72} radius={999} />
        <Skeleton w="100%" h={44} radius={8} />
        <Skeleton w="100%" h={44} radius={8} />
      </div>
    </section>
  );
}
