import { useMemo, useState } from "react";
import { Callout, Pill, Row, Select, Stack, Text, TextInput, useCanvasState, useHostTheme } from "../canvas-shim";
import FX from "../../../data/fx.json";
import { PATTERNS, type C, type Mark, type Tone } from "./patterns";

type FxTf = { bars: string; opts: number[][]; ans: number; good: number[][] };
type FxEntry = { pair: string; jpy: boolean; W: FxTf; D: FxTf };
const FXD = FX as FxEntry[];

export type Bar = { d: string; o: number; h: number; l: number; c: number };

export function decode(e: FxEntry, tf: "W" | "D"): Bar[] {
  const k = e.jpy ? 1e3 : 1e5;
  return e[tf].bars.split(";").filter(Boolean).map((s) => {
    const [d, o, h, l, c] = s.split(":");
    return { d: `${d.slice(0, 2)}.${d.slice(2)}`, o: +o / k, h: +h / k, l: +l / k, c: +c / k };
  });
}

export type Swing = { i: number; v: number; hi: boolean; tag: string };

export function swings(closes: number[], thr: number): Swing[] {
  const piv: { i: number; v: number; hi: boolean }[] = [];
  let dir = 0;
  let ext = 0;
  let start = 0;
  for (let i = 1; i < closes.length; i++) {
    const c = closes[i];
    if (dir === 0) {
      if (c - closes[start] >= thr) { dir = 1; ext = i; piv.push({ i: start, v: closes[start], hi: false }); }
      else if (closes[start] - c >= thr) { dir = -1; ext = i; piv.push({ i: start, v: closes[start], hi: true }); }
      else if (Math.abs(c - closes[start]) < 1e-12) start = i;
      continue;
    }
    if (dir === 1) {
      if (c > closes[ext]) ext = i;
      else if (closes[ext] - c >= thr) { piv.push({ i: ext, v: closes[ext], hi: true }); dir = -1; ext = i; }
    } else {
      if (c < closes[ext]) ext = i;
      else if (c - closes[ext] >= thr) { piv.push({ i: ext, v: closes[ext], hi: false }); dir = 1; ext = i; }
    }
  }
  if (dir !== 0) piv.push({ i: ext, v: closes[ext], hi: dir === 1 });
  let lastH: number | null = null;
  let lastL: number | null = null;
  return piv.map((p) => {
    let tag: string;
    if (p.hi) { tag = lastH === null ? "H" : p.v > lastH ? "HH" : "LH"; lastH = p.v; }
    else { tag = lastL === null ? "L" : p.v > lastL ? "HL" : "LL"; lastL = p.v; }
    return { ...p, tag };
  });
}

const TAG_RU: Record<string, string> = {
  HH: "HH — higher high, вершина выше прошлой",
  HL: "HL — higher low, откат выше прошлого",
  LH: "LH — lower high, вершина ниже прошлой",
  LL: "LL — lower low, минимум ниже прошлого",
  H: "Первая вершина (не с чем сравнить)",
  L: "Первый минимум (не с чем сравнить)",
};

export function ema(vals: number[], p: number): number[] {
  const k = 2 / (p + 1);
  const out: number[] = [];
  vals.forEach((v, i) => out.push(i ? v * k + out[i - 1] * (1 - k) : v));
  return out;
}

function toneColor(T: ReturnType<typeof useHostTheme>, t?: Tone) {
  return t === "green" ? T.category.green : t === "red" ? T.category.red : t === "muted" ? T.text.tertiary : T.accent.primary;
}

export type ChartMode = "candles" | "line" | "bars";

export function AnnotatedChart({
  candles, marks, fmt, xLabels, emaLine, snake, mode = "candles", height = 340, title, note,
}: {
  candles: C[]; marks: Mark[]; fmt?: (v: number) => string; xLabels?: string[]; emaLine?: number[];
  snake?: { i: number; v: number }[]; mode?: ChartMode; height?: number; title?: string; note?: string;
}) {
  const T = useHostTheme();
  const [hot, setHot] = useState<number | null>(null);
  const W = 780;
  const H = height;
  const padL = 8;
  const padR = fmt ? 74 : 40;
  const padT = 26;
  const padB = xLabels ? 24 : 12;
  const n = candles.length;
  const ys: number[] = [];
  candles.forEach(([, h, l]) => ys.push(h, l));
  marks.forEach((m) => {
    if (m.t === "h") ys.push(m.y);
    else if (m.t === "zone") ys.push(m.y1, m.y2);
    else if (m.t === "pt") ys.push(m.y);
    else ys.push(m.y1, m.y2);
  });
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  const span = hi - lo || 1;
  lo -= span * 0.06;
  hi += span * 0.06;
  const step = (W - padL - padR) / Math.max(n, 1);
  const X = (i: number) => padL + step * (i + 0.5);
  const Y = (v: number) => padT + ((hi - v) / (hi - lo)) * (H - padT - padB);
  const bw = Math.max(2, Math.min(14, step * 0.62));
  const dim = (k: number) => (hot === null || hot === k ? 1 : 0.18);
  const edgeR = W - padR;

  const ticks: number[] = [];
  if (fmt) {
    const raw = (hi - lo) / 6;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const st = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
    for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) ticks.push(v);
  }

  const badge = (k: number, x: number, y: number, col: string, key: string) => (
    <g key={key} opacity={dim(k)} style={{ cursor: "pointer" }} onMouseEnter={() => setHot(k)} onMouseLeave={() => setHot(null)}>
      <circle cx={x} cy={y} r={9} fill={T.bg.editor} stroke={col} strokeWidth={1.6} />
      <text x={x} y={y + 3.8} fontSize={11} fontWeight={700} textAnchor="middle" fill={col}>{k}</text>
    </g>
  );

  const legend = useMemo(() => {
    const seen = new Map<number, { label: string; tone?: Tone }>();
    marks.forEach((m) => { if (m.label && !seen.has(m.n)) seen.set(m.n, { label: m.label, tone: m.tone }); });
    return [...seen.entries()].sort((a, b) => a[0] - b[0]);
  }, [marks]);

  return (
    <Stack gap={8}>
      {title ? <Text weight="semibold">{title}</Text> : null}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: T.bg.editor, borderRadius: 8, border: `1px solid ${T.stroke.tertiary}` }}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={padL} x2={edgeR} y1={Y(v)} y2={Y(v)} stroke={T.stroke.tertiary} strokeWidth={0.6} />
            <text x={W - 4} y={Y(v) + 4} fontSize={10} textAnchor="end" fill={T.text.tertiary}>{fmt!(v)}</text>
          </g>
        ))}
        {xLabels ? xLabels.map((s, i) => (i % Math.ceil(n / 9) === 0 ? <text key={i} x={X(i)} y={H - 7} fontSize={10} textAnchor="middle" fill={T.text.tertiary}>{s}</text> : null)) : null}

        {marks.filter((m) => m.t === "zone").map((m, j) => {
          if (m.t !== "zone") return null;
          const col = toneColor(T, m.tone);
          const x1 = m.from === undefined ? padL : X(m.from) - step / 2;
          const x2 = m.to === undefined ? edgeR : X(m.to) + step / 2;
          return (
            <g key={`z${j}`} opacity={dim(m.n)} onMouseEnter={() => setHot(m.n)} onMouseLeave={() => setHot(null)}>
              <rect x={x1} y={Y(m.y2)} width={x2 - x1} height={Math.max(2, Y(m.y1) - Y(m.y2))} fill={col} fillOpacity={0.16} stroke={col} strokeOpacity={0.6} strokeDasharray="4 3" />
            </g>
          );
        })}

        {emaLine ? <polyline fill="none" stroke="#f5b84d" strokeWidth={1.8} points={emaLine.map((v, i) => `${X(i)},${Y(v)}`).join(" ")} /> : null}

        {mode === "line" ? (
          <polyline fill="none" stroke={T.text.primary} strokeWidth={1.8} points={candles.map((c, i) => `${X(i)},${Y(c[3])}`).join(" ")} />
        ) : candles.map(([o, h, l, c], i) => {
          const up = c >= o;
          const col = up ? T.category.green : T.category.red;
          if (mode === "bars") {
            return (
              <g key={i} stroke={col} strokeWidth={1.4}>
                <line x1={X(i)} x2={X(i)} y1={Y(h)} y2={Y(l)} />
                <line x1={X(i) - bw / 2} x2={X(i)} y1={Y(o)} y2={Y(o)} />
                <line x1={X(i)} x2={X(i) + bw / 2} y1={Y(c)} y2={Y(c)} />
              </g>
            );
          }
          return (
            <g key={i}>
              <line x1={X(i)} x2={X(i)} y1={Y(h)} y2={Y(l)} stroke={col} strokeWidth={1.1} />
              <rect x={X(i) - bw / 2} y={Y(Math.max(o, c))} width={bw} height={Math.max(1.2, Math.abs(Y(o) - Y(c)))} fill={col} />
            </g>
          );
        })}

        {snake ? <polyline fill="none" stroke={T.accent.primary} strokeWidth={1.6} strokeDasharray="5 4" points={snake.map((p) => `${X(p.i)},${Y(p.v)}`).join(" ")} /> : null}

        {marks.map((m, j) => {
          const col = toneColor(T, m.tone);
          if (m.t === "h") {
            const x1 = m.from === undefined ? padL : X(m.from);
            const x2 = m.to === undefined ? edgeR : X(m.to);
            return (
              <g key={`h${j}`} opacity={dim(m.n)} onMouseEnter={() => setHot(m.n)} onMouseLeave={() => setHot(null)}>
                <line x1={x1} x2={x2} y1={Y(m.y)} y2={Y(m.y)} stroke={col} strokeWidth={1.6} strokeDasharray={m.dashed ? "6 4" : undefined} />
                {fmt ? <text x={x2 + 4} y={Y(m.y) + 4} fontSize={10} fill={col}>{fmt(m.y)}</text> : null}
              </g>
            );
          }
          if (m.t === "seg") {
            return (
              <line key={`s${j}`} opacity={dim(m.n)} x1={X(m.i1)} x2={X(m.i2)} y1={Y(m.y1)} y2={Y(m.y2)} stroke={col} strokeWidth={1.6} strokeDasharray={m.dashed ? "6 4" : undefined} />
            );
          }
          if (m.t === "pt") {
            return <circle key={`p${j}`} opacity={dim(m.n)} cx={X(m.i)} cy={Y(m.y)} r={3.2} fill={col} />;
          }
          return null;
        })}

        {marks.map((m, j) => {
          const col = toneColor(T, m.tone);
          if (m.t === "h") return badge(m.n, (m.from === undefined ? padL : X(m.from)) + 12, Y(m.y) - 12, col, `bh${j}`);
          if (m.t === "zone") return badge(m.n, (m.from === undefined ? padL : X(m.from) - step / 2) + 12 + ((m.n - 1) % 4) * 24, Y(m.y2) - 11, col, `bz${j}`);
          if (m.t === "seg") return badge(m.n, (X(m.i1) + X(m.i2)) / 2, Math.min(Y(m.y1), Y(m.y2)) - 13, col, `bs${j}`);
          return badge(m.n, X(m.i), Y(m.y) + (m.below ? 16 : -16), col, `bp${j}`);
        })}
      </svg>
      {legend.length ? (
        <Stack gap={4}>
          {legend.map(([k, v]) => {
            const col = toneColor(T, v.tone);
            return (
              <div key={k} onMouseEnter={() => setHot(k)} onMouseLeave={() => setHot(null)} onClick={() => setHot(hot === k ? null : k)}
                style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", padding: "3px 6px", borderRadius: 6, background: hot === k ? T.fill.tertiary : "transparent" }}>
                <span style={{ flex: "0 0 22px", height: 22, borderRadius: 11, border: `1.6px solid ${col}`, color: col, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{k}</span>
                <span style={{ fontSize: 13.5, lineHeight: 1.45, color: T.text.primary, paddingTop: 2 }}>{v.label}</span>
              </div>
            );
          })}
        </Stack>
      ) : null}
      {note ? <Text tone="secondary" size="small">{note}</Text> : null}
    </Stack>
  );
}

function autoMarks(closes: number[], thr: number, fmt?: (v: number) => string, maxN = 12, xLabels?: string[]) {
  const sw = swings(closes, thr);
  const shown = sw.slice(-maxN);
  const marks: Mark[] = shown.map((s, k) => ({
    t: "pt",
    n: k + 1,
    i: s.i,
    y: s.v,
    below: !s.hi,
    tone: s.tag === "HH" || s.tag === "HL" ? "green" : s.tag === "LH" || s.tag === "LL" ? "red" : "muted",
    label: `${TAG_RU[s.tag]}${fmt ? ` — закрытие ${fmt(s.v)}${xLabels ? ` (${xLabels[s.i]})` : ""}` : ""}`,
  }));
  return { sw, shown, marks };
}

export function PatternChart({ pattern }: { pattern: string }) {
  const p = PATTERNS[pattern];
  if (!p) return <Text tone="secondary">Схема «{pattern}» не найдена.</Text>;
  let marks = p.marks;
  let snake: { i: number; v: number }[] | undefined;
  if (p.auto) {
    const closes = p.candles.map((c) => c[3]);
    const a = autoMarks(closes, 3);
    snake = a.shown;
    const ids = [...new Set(p.marks.map((m) => m.n))];
    const remap = new Map(ids.map((id, k) => [id, a.marks.length + k + 1]));
    marks = [...a.marks, ...p.marks.map((m) => ({ ...m, n: remap.get(m.n)! }))];
  }
  const e = p.ema ? ema(p.candles.map((c) => c[3]), p.ema) : undefined;
  return <AnnotatedChart title={`Схема: ${p.title}`} candles={p.candles} marks={marks} snake={snake} emaLine={e} note={p.note} />;
}

function usePair(key: string) {
  const [pair, setPair] = useCanvasState(`full:${key}:pair`, "EURUSD");
  const [tf, setTf] = useCanvasState<"W" | "D">(`full:${key}:tf`, "D");
  const e = FXD.find((x) => x.pair === pair) ?? FXD[0];
  const pip = e.jpy ? 0.01 : 0.0001;
  const dec = e.jpy ? 3 : 5;
  const fmt = (v: number) => v.toFixed(dec);
  const all = decode(e, tf);
  const bars = tf === "D" ? all.slice(-130) : all;
  const picker = (
    <Row gap={8} wrap align="center">
      <Select value={pair} onChange={setPair} options={FXD.map((x) => ({ value: x.pair, label: x.pair }))} />
      <Pill active={tf === "W"} onClick={() => setTf("W")}>Неделя</Pill>
      <Pill active={tf === "D"} onClick={() => setTf("D")}>День</Pill>
      <Text tone="tertiary" size="small">Данные OANDA, выгружены с TradingView 03.11.2026</Text>
    </Row>
  );
  return { e, tf, pip, fmt, bars, picker };
}

const toC = (b: Bar[]): C[] => b.map((x) => [x.o, x.h, x.l, x.c]);

export function StructureReal() {
  const { tf, fmt, bars, picker } = usePair("struct");
  const closes = bars.map((b) => b.c);
  const diffs = closes.slice(1).map((c, i) => Math.abs(c - closes[i]));
  const avg = diffs.reduce((a, b) => a + b, 0) / Math.max(diffs.length, 1);
  const thr = avg * (tf === "W" ? 2.2 : 3);
  const xl = bars.map((b) => b.d);
  const { sw, shown, marks } = autoMarks(closes, thr, fmt, 10, xl);
  const lastH = [...sw].reverse().find((s) => s.hi);
  const lastL = [...sw].reverse().find((s) => !s.hi);
  const up = lastH?.tag === "HH" && lastL?.tag === "HL";
  const down = lastH?.tag === "LH" && lastL?.tag === "LL";
  const extra: Mark[] = [];
  const nx = marks.length + 1;
  if (up && lastL) extra.push({ t: "h", n: nx, y: lastL.v, from: lastL.i, label: `Последний HL ${fmt(lastL.v)}: закрытие тела ниже = смена тренда на нисходящий`, tone: "red", dashed: true });
  if (down && lastH) extra.push({ t: "h", n: nx, y: lastH.v, from: lastH.i, label: `Последний LH ${fmt(lastH.v)}: закрытие тела выше = смена тренда на восходящий`, tone: "green", dashed: true });
  return (
    <Stack gap={8}>
      {picker}
      <AnnotatedChart candles={toC(bars)} marks={[...marks, ...extra]} snake={shown} fmt={fmt} xLabels={xl}
        title={`Структура по закрытиям тел: ${up ? "восходящий тренд" : down ? "нисходящий тренд" : "структура смешанная (нет чистой пары HH+HL или LH+LL)"}`}
        note="Пунктир — «змейка» по закрытиям тел, как у Алекса на линейном графике. Номера — последние локти. Разметка автоматическая и может пропустить мелкие откаты; глазами проверяйте на линейном графике." />
    </Stack>
  );
}

export function zonePivots(bars: Bar[], z: [number, number]) {
  let n = 0;
  for (let i = 1; i < bars.length - 1; i++) {
    const c = bars[i].c;
    if (c < z[0] || c > z[1]) continue;
    const p = bars[i - 1].c;
    const q = bars[i + 1].c;
    if ((c > p && c >= q) || (c < p && c <= q)) n++;
  }
  return n;
}

export function ZonesReal() {
  const { e, tf, pip, fmt, bars, picker } = usePair("zones");
  const good = e[tf].good
    .map((g) => ({ g, z: [g[0] * pip, g[1] * pip] as [number, number] }))
    .map((x) => ({ ...x, p: zonePivots(bars, x.z) }))
    .filter((x) => x.p >= 3);
  const marks: Mark[] = good.map(({ g, z, p }, k) => (
    { t: "zone", n: k + 1, y1: z[0], y2: z[1], tone: "accent", label: `Зона ${k + 1}: ${fmt(z[0])}–${fmt(z[1])}, ширина ${g[1] - g[0]} пипсов, разворотов телом внутри: ${p}` }
  ));
  return (
    <Stack gap={8}>
      {picker}
      <AnnotatedChart candles={toC(bars)} marks={marks} fmt={fmt} xLabels={bars.map((b) => b.d)} title={`${e.pair}, ${tf === "W" ? "неделя" : "день"}: ${good.length ? "зоны с 3+ разворотами телом" : "на этом отрезке нет зоны с 3+ разворотами — переключите таймфрейм или пару"}`}
        note="Зоны найдены автоматически: ширина 50 пипсов, считаются только развороты закрытий (локти), тени не учитываются. Наведите на номер, чтобы подсветить зону." />
    </Stack>
  );
}

export function ChartTypesReal() {
  const { fmt, bars, picker } = usePair("types");
  const [mode, setMode] = useCanvasState<ChartMode>("full:types:mode", "line");
  const last = bars.slice(-40);
  const marks: Mark[] = mode === "line"
    ? [{ t: "pt", n: 1, i: last.length - 1, y: last[last.length - 1].c, label: "Линия соединяет только закрытия — шум теней убран, локти видны лучше всего" }]
    : mode === "candles"
      ? [{ t: "pt", n: 1, i: last.length - 1, y: last[last.length - 1].h, label: "Свеча: тело = открытие и закрытие, тени = максимум и минимум за период" }]
      : [{ t: "pt", n: 1, i: last.length - 1, y: last[last.length - 1].h, label: "Бар: засечка слева — открытие, справа — закрытие" }];
  return (
    <Stack gap={8}>
      {picker}
      <Row gap={6}>
        <Pill active={mode === "line"} onClick={() => setMode("line")}>Линейный</Pill>
        <Pill active={mode === "candles"} onClick={() => setMode("candles")}>Японские свечи</Pill>
        <Pill active={mode === "bars"} onClick={() => setMode("bars")}>Бары</Pill>
      </Row>
      <AnnotatedChart candles={toC(last)} marks={marks} fmt={fmt} xLabels={last.map((b) => b.d)} mode={mode} height={280} />
    </Stack>
  );
}

const SESS = [
  { n: 1, name: "Сидней + Токио (Азия)", a: 17, b: 24, col: "#8b8fa3", note: "Тихо, Алекс не торгует" },
  { n: 2, name: "Пред-Лондон", a: 1, b: 2, col: "#c9a227", note: "Появляется волатильность, начало его рабочего окна" },
  { n: 3, name: "Лондон", a: 3, b: 12, col: "#6ea8fe", note: "«Битва начинается» — главная ликвидность" },
  { n: 4, name: "Нью-Йорк", a: 8, b: 17, col: "#3fb68b", note: "Перекрытие с Лондоном 8:00–12:00 — самое волатильное время; к середине сессии рынок затихает (конец полосы условный)" },
  { n: 5, name: "Окно Алекса", a: 1, b: 10.5, col: "#f0616d", note: "Ищет входы 1:00–10:30 по Нью-Йорку" },
];

export function SessionsChart() {
  const T = useHostTheme();
  const [summer, setSummer] = useCanvasState("full:sess:summer", false);
  const [hot, setHot] = useState<number | null>(null);
  const shift = summer ? 7 : 8;
  const W = 780;
  const x = (h: number) => 120 + ((((h + shift) % 24) + 24) % 24) * ((W - 140) / 24);
  const fmtH = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${h % 1 ? "30" : "00"}`;
  const segs = (a: number, b: number) => {
    const s = (((a + shift) % 24) + 24) % 24;
    const e = s + (b - a);
    return e <= 24 ? [[s, e]] : [[s, 24], [0, e - 24]];
  };
  return (
    <Stack gap={8}>
      <Row gap={6} align="center" wrap>
        <Pill active={!summer} onClick={() => setSummer(false)}>Зимнее время в США (ноябрь–март): МСК = Нью-Йорк + 8</Pill>
        <Pill active={summer} onClick={() => setSummer(true)}>Летнее (март–ноябрь): + 7</Pill>
      </Row>
      <svg viewBox={`0 0 ${W} 230`} style={{ width: "100%", background: T.bg.editor, borderRadius: 8, border: `1px solid ${T.stroke.tertiary}` }}>
        {Array.from({ length: 25 }, (_, h) => (
          <g key={h}>
            <line x1={120 + h * ((W - 140) / 24)} x2={120 + h * ((W - 140) / 24)} y1={20} y2={200} stroke={T.stroke.tertiary} strokeWidth={0.5} />
            {h % 2 === 0 ? <text x={120 + h * ((W - 140) / 24)} y={216} fontSize={10} textAnchor="middle" fill={T.text.tertiary}>{h}</text> : null}
          </g>
        ))}
        <text x={8} y={216} fontSize={10} fill={T.text.tertiary}>часы по МСК</text>
        {SESS.map((s, k) => (
          <g key={s.n} opacity={hot === null || hot === s.n ? 1 : 0.2} onMouseEnter={() => setHot(s.n)} onMouseLeave={() => setHot(null)}>
            <circle cx={16} cy={40 + k * 34} r={9} fill={T.bg.editor} stroke={s.col} strokeWidth={1.6} />
            <text x={16} y={44 + k * 34} fontSize={11} fontWeight={700} textAnchor="middle" fill={s.col}>{s.n}</text>
            <text x={32} y={44 + k * 34} fontSize={11} fill={T.text.secondary}>{s.name.split(" (")[0]}</text>
            {segs(s.a, s.b).map(([a, b], j) => (
              <rect key={j} x={120 + a * ((W - 140) / 24)} y={30 + k * 34} width={(b - a) * ((W - 140) / 24)} height={20} rx={4} fill={s.col} fillOpacity={0.55} />
            ))}
          </g>
        ))}
        <line x1={x(17)} x2={x(17)} y1={20} y2={200} stroke={T.category.red} strokeDasharray="4 3" />
        <text x={x(17) + 4} y={28} fontSize={10} fill={T.category.red}>6 — закрытие дня</text>
      </svg>
      <Stack gap={4}>
        {SESS.map((s) => (
          <div key={s.n} onMouseEnter={() => setHot(s.n)} onMouseLeave={() => setHot(null)} style={{ display: "flex", gap: 10, fontSize: 13.5, cursor: "pointer" }}>
            <b style={{ color: s.col, width: 18 }}>{s.n}</b>
            <span>{s.name}: {fmtH(s.a)}–{fmtH(s.b % 24)} Нью-Йорк = {fmtH((s.a + shift) % 24)}–{fmtH((s.b + shift) % 24)} МСК. {s.note}.</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 10, fontSize: 13.5 }}>
          <b style={{ color: T.category.red, width: 18 }}>6</b>
          <span>Закрытие дневной свечи: 17:00 Нью-Йорк = {fmtH((17 + shift) % 24)} МСК. Новая дневная свеча начинается здесь.</span>
        </div>
      </Stack>
      <Text tone="tertiary" size="small">Границы сессий приблизительные: Алекс называет часы по Нью-Йорку (EST), разные источники сдвигают их на час.</Text>
    </Stack>
  );
}

export function RiskTool() {
  const [dep, setDep] = useCanvasState("full:risk:dep", "1000");
  const [riskPct, setRiskPct] = useCanvasState("full:risk:pct", "1");
  const [sl, setSl] = useCanvasState("full:risk:sl", "25");
  const [rr, setRr] = useCanvasState("full:risk:rr", "2");
  const d = +dep || 0;
  const r = +riskPct || 0;
  const s = +sl || 0;
  const k = +rr || 0;
  const money = (d * r) / 100;
  const lot = s > 0 ? money / (s * 10) : 0;
  const entry = 50;
  const marks: Mark[] = [
    { t: "h", n: 1, y: entry, from: 5, label: "Вход", tone: "accent" },
    { t: "h", n: 2, y: entry - 10, from: 5, label: `Стоп ${s} пипсов = −$${money.toFixed(2)} (${r}% депозита)`, tone: "red", dashed: true },
    { t: "h", n: 3, y: entry + 10 * k, from: 5, label: `Тейк ${(s * k).toFixed(0)} пипсов = +$${(money * k).toFixed(2)} (1:${k})`, tone: "green", dashed: true },
  ];
  const candles: C[] = [[62, 63, 55, 56], [56, 57, 51, 52], [52, 53, 47, 48], [48, 49, 44, 45], [45, 47, 42, 43], [43, 51, 42, 50]];
  for (let i = 0; i < 6; i++) { const o = candles[candles.length - 1][3]; const c = o + 2.2 * k; candles.push([o, c + 1, o - 1, c]); }
  const wins = k > 0 ? (1 / (1 + k)) * 100 : 0;
  return (
    <Stack gap={10}>
      <Row gap={10} wrap>
        <label style={{ fontSize: 13 }}>Депозит, $<TextInput value={dep} onChange={setDep} /></label>
        <label style={{ fontSize: 13 }}>Риск, %<TextInput value={riskPct} onChange={setRiskPct} /></label>
        <label style={{ fontSize: 13 }}>Стоп, пипсов<TextInput value={sl} onChange={setSl} /></label>
        <label style={{ fontSize: 13 }}>Цель, R<TextInput value={rr} onChange={setRr} /></label>
      </Row>
      <Text>Лот для пары с котировкой в USD (EURUSD, GBPUSD и т.п., 1 лот = $10 за пипс): <b>{lot.toFixed(2)}</b>. При 1:{k} достаточно выигрывать <b>{wins.toFixed(0)}%</b> сделок, чтобы выйти в ноль.</Text>
      <AnnotatedChart candles={candles} marks={marks} height={260} />
      {r > 5 ? <Callout tone="warning" title="Риск выше 5%">Алекс в челлендже рисковал гораздо больше и сам говорит, что так делать не советует. Для обычного счёта он называет нормой 3–5%, а большинство учебников — 1–2%.</Callout> : null}
    </Stack>
  );
}

const GROUPS: Record<string, string> = { USD: "Мажоры (с долларом)", EUR: "Кроссы евро", GBP: "Кроссы фунта", AUD: "Кроссы австралийца", NZD: "Кроссы новозеландца", CAD: "Кроссы канадца", CHF: "Кроссы франка" };

export function PairsTable() {
  const T = useHostTheme();
  const groups: Record<string, FxEntry[]> = {};
  FXD.forEach((e) => {
    const g = e.pair.includes("USD") ? "USD" : e.pair.slice(0, 3);
    (groups[g] ??= []).push(e);
  });
  return (
    <Stack gap={8}>
      {Object.entries(groups).map(([g, list], k) => (
        <div key={g} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ flex: "0 0 22px", height: 22, borderRadius: 11, border: `1.6px solid ${T.accent.primary}`, color: T.accent.primary, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{k + 1}</span>
          <div>
            <Text weight="semibold">{GROUPS[g] ?? g}</Text>
            <Text tone="secondary" size="small">
              {list.map((e) => { const b = decode(e, "D"); return `${e.pair} ${b[b.length - 1].c.toFixed(e.jpy ? 3 : 5)}`; }).join(" · ")}
            </Text>
          </div>
        </div>
      ))}
      <Text tone="tertiary" size="small">Пипс — 4-й знак после запятой (0,0001), у пар с иеной — 2-й (0,01). Цены — закрытие последнего дня в выгрузке.</Text>
    </Stack>
  );
}

export function LessonChart({ kind, pattern }: { kind: string; pattern?: string }) {
  if (kind === "pattern" && pattern) return <PatternChart pattern={pattern} />;
  if (kind === "structure") return <StructureReal />;
  if (kind === "zones") return <ZonesReal />;
  if (kind === "chart-types") return <ChartTypesReal />;
  if (kind === "sessions") return <SessionsChart />;
  if (kind === "risk") return <RiskTool />;
  if (kind === "pairs") return <PairsTable />;
  return null;
}
