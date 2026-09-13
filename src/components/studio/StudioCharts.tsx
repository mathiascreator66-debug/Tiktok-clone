"use client";

/** Simple SVG line / area chart — no chart library. */
export function LineChart({
  data,
  height = 140,
  color = "#25f4ee",
  fill = true,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  fill?: boolean;
}) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-white/35 text-sm"
        style={{ height }}
      >
        Pas encore de données
      </div>
    );
  }
  const w = 320;
  const padX = 8;
  const padY = 12;
  const max = Math.max(...data.map((d) => d.value), 1);
  const points = data.map((d, i) => {
    const x =
      padX + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * (w - padX * 2));
    const y = padY + (1 - d.value / max) * (height - padY * 2);
    return { x, y, ...d };
  });
  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${points[0].x},${height - padY} ${line} ${points[points.length - 1].x},${height - padY}`;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
        role="img"
        aria-label="Graphique"
      >
        {fill && (
          <polygon points={area} fill={color} opacity={0.12} />
        )}
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-white/35 px-1 -mt-1">
        <span>{data[0]?.label}</span>
        {data.length > 2 && (
          <span>{data[Math.floor(data.length / 2)]?.label}</span>
        )}
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function RetentionChart({
  points,
}: {
  points: { pct: number; rate: number }[];
}) {
  return (
    <LineChart
      data={points.map((p) => ({
        label: `${p.pct} %`,
        value: p.rate,
      }))}
      color="#fe2c55"
      height={120}
    />
  );
}

export function BarRow({
  label,
  pct,
  count,
  color = "#25f4ee",
}: {
  label: string;
  pct: number;
  count?: number;
  color?: string;
}) {
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/70">{label}</span>
        <span className="text-white/45">
          {pct.toFixed(pct % 1 ? 1 : 0).replace(".", ",")} %
          {count != null ? ` · ${count}` : ""}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
        />
      </div>
    </div>
  );
}
