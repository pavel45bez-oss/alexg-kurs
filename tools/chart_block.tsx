function zoneStats(bars: Bar[], z: Zone, pip = 0.0001) {
  const lo = z.lo * pip - pip / 1000;
  const hi = z.hi * pip + pip / 1000;
  let wicks = 0;
  let through = 0;
  const tapIdx: number[] = [];
  bars.forEach((b, i) => {
    const [, o, h, l, c] = b;
    const inZone = c >= lo && c <= hi;
    if (inZone && i > 0 && i < bars.length - 1) {
      const p = bars[i - 1][4];
      const n = bars[i + 1][4];
      if ((c > p && c >= n) || (c < p && c <= n)) tapIdx.push(i);
    }
    const bodyIn = (o >= lo && o <= hi) || inZone;
    if ((o > hi && c < lo) || (o < lo && c > hi)) through += 1;
    else if (!bodyIn && h >= lo && l <= hi) wicks += 1;
  });
  return { width: z.hi - z.lo, taps: tapIdx.length, wicks, through, tapIdx };
}

type Band = Zone & { label?: string; kind?: "zone" | "ok" | "bad" | "hint" | "muted" };

const fmt = (p: number, pip: number) => p.toFixed(pip < 0.001 ? 4 : 2).replace(".", ",");

function CandleChart({ bars, zone, zones, tapIdx, title, pip = 0.0001, caption }: {
  bars: Bar[]; zone?: Zone; zones?: Band[]; tapIdx: number[]; title: string; pip?: number; caption?: string;
}) {
  const theme = useHostTheme();
  const W = 780;
  const H = 330;
  const padL = 62;
  const padR = 26;
  const padT = 14;
  const padB = 34;
  const bands: Band[] = zones ?? (zone ? [{ ...zone, kind: "zone" }] : []);
  const lows = bars.map((b) => b[3]);
  const highs = bars.map((b) => b[2]);
  const minP = Math.min(...lows, ...bands.map((z) => z.lo * pip)) - 20 * pip;
  const maxP = Math.max(...highs, ...bands.map((z) => z.hi * pip)) + 20 * pip;
  const y = (p: number) => padT + ((maxP - p) / (maxP - minP)) * (H - padT - padB);
  const step = (W - padL - padR) / bars.length;
  const cw = Math.max(1.5, step * 0.62);
  const rangePips = (maxP - minP) / pip;
  const tickPips = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000].find((t) => rangePips / t <= 9) ?? 5000;
  const ticks: number[] = [];
  for (let t = Math.ceil(minP / pip / tickPips) * tickPips; t * pip <= maxP; t += tickPips) ticks.push(t * pip);
  const labelEvery = Math.ceil(bars.length / 10);
  const tapSet = new Set(tapIdx);
  const color = (k?: Band["kind"]) =>
    k === "ok" || k === "hint" ? theme.category.green : k === "bad" ? theme.category.red : k === "muted" ? theme.text.tertiary : theme.accent.primary;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {ticks.map((p) => (
        <g key={p}>
          <line x1={padL} x2={W - padR} y1={y(p)} y2={y(p)} stroke={theme.stroke.tertiary} strokeWidth={0.5} strokeDasharray="2 3" />
          <text x={padL - 6} y={y(p) + 3} textAnchor="end" fontSize={10} fill={theme.text.tertiary}>
            {fmt(p, pip)}
          </text>
        </g>
      ))}
      {bands.map((z, i) => {
        const top = y(z.hi * pip);
        const bot = y(z.lo * pip);
        const col = color(z.kind);
        return (
          <g key={i}>
            <rect x={padL} y={top} width={W - padL - padR} height={Math.max(1, bot - top)} fill={col} opacity={z.kind === "muted" ? 0.08 : 0.16} />
            <line x1={padL} x2={W - padR} y1={top} y2={top} stroke={col} strokeWidth={1} strokeDasharray={z.kind === "hint" ? "4 3" : undefined} />
            <line x1={padL} x2={W - padR} y1={bot} y2={bot} stroke={col} strokeWidth={1} strokeDasharray={z.kind === "hint" ? "4 3" : undefined} />
            {z.label ? (
              <text x={W - padR + 6} y={(top + bot) / 2 + 4} fontSize={12} fontWeight={700} fill={col}>{z.label}</text>
            ) : null}
          </g>
        );
      })}
      {bars.map((b, i) => {
        const [d, o, h, l, c] = b;
        const x = padL + i * step + step / 2;
        const up = c >= o;
        const col = up ? theme.category.green : theme.category.red;
        const top = y(Math.max(o, c));
        const bot = y(Math.min(o, c));
        return (
          <g key={d + i}>
            <line x1={x} x2={x} y1={y(h)} y2={y(l)} stroke={col} strokeWidth={1} />
            <rect x={x - cw / 2} y={top} width={cw} height={Math.max(1, bot - top)} fill={col} />
            {tapSet.has(i) ? <circle cx={x} cy={y(h) - 7} r={3} fill={theme.accent.primary} /> : null}
            {i % labelEvery === 0 ? (
              <text x={x} y={H - padB + 14} textAnchor="middle" fontSize={10} fill={theme.text.tertiary}>
                {d}
              </text>
            ) : null}
          </g>
        );
      })}
      <text x={padL} y={H - 4} fontSize={10} fill={theme.text.tertiary}>
        {caption ?? `${title}. Ось Y: цена GBPAUD. Ось X: дата 2026. Точка над свечой: разворот закрытием в зоне. Источник: OANDA через TradingView.`}
      </text>
    </svg>
  );
}

