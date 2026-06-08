import type { CSSProperties } from "react";

type SkeletonProps = {
  w?: number | string;
  h?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({ w, h = 14, radius, className, style }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={className ? `sk ${className}` : "sk"}
      style={{ width: w, height: h, borderRadius: radius, ...style }}
    />
  );
}
