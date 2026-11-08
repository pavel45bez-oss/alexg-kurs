import { useState, type CSSProperties, type ReactNode } from "react";

const T = {
  bg: { editor: "#16171b", card: "#1e1f24", chrome: "#26272d" },
  text: { primary: "#e6e6e9", secondary: "#a9abb3", tertiary: "#7c7e87" },
  stroke: { primary: "#4a4c55", secondary: "#3a3c44", tertiary: "#2e3037" },
  fill: { tertiary: "#2a2b31" },
  accent: { primary: "#6ea8fe" },
  category: { green: "#3fb68b", red: "#f0616d" },
};

export function useHostTheme() {
  return T;
}

export function useCanvasState<V>(key: string, initial: V): [V, (v: V | ((p: V) => V)) => void] {
  const storageKey = `alexg-kurs:${key}`;
  const [value, setValue] = useState<V>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw === null ? initial : (JSON.parse(raw) as V);
    } catch {
      return initial;
    }
  });
  const set = (v: V | ((p: V) => V)) => {
    setValue((prev) => {
      const next = typeof v === "function" ? (v as (p: V) => V)(prev) : v;
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };
  return [value, set];
}

type Box = { children?: ReactNode; style?: CSSProperties };

export function Stack({ children, gap = 8, style }: Box & { gap?: number }) {
  return <div style={{ display: "flex", flexDirection: "column", gap, ...style }}>{children}</div>;
}

export function Row({ children, gap = 8, align, justify, wrap, style }: Box & { gap?: number; align?: string; justify?: string; wrap?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "row", gap, alignItems: align ?? "center", justifyContent: justify, flexWrap: wrap ? "wrap" : undefined, ...style }}>
      {children}
    </div>
  );
}

export function Grid({ children, columns = 2, gap = 8, style }: Box & { columns?: number | string; gap?: number; align?: string }) {
  const cols = typeof columns === "number" ? `repeat(auto-fit, minmax(${columns > 2 ? 160 : 340}px, 1fr))` : columns;
  return <div style={{ display: "grid", gridTemplateColumns: cols, gap, ...style }}>{children}</div>;
}

export function Divider({ style }: { style?: CSSProperties }) {
  return <div style={{ height: 1, background: T.stroke.tertiary, width: "100%", ...style }} />;
}

export function Card({ children, style }: Box & { variant?: string; size?: string }) {
  return <div style={{ border: `1px solid ${T.stroke.secondary}`, borderRadius: 10, background: T.bg.card, overflow: "hidden", ...style }}>{children}</div>;
}

export function CardHeader({ children, trailing, style }: Box & { trailing?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${T.stroke.tertiary}`, fontWeight: 600, fontSize: 14, ...style }}>
      <div>{children}</div>
      {trailing}
    </div>
  );
}

export function CardBody({ children, style }: Box) {
  return <div style={{ padding: 14, ...style }}>{children}</div>;
}

const tones: Record<string, string> = {
  primary: T.text.primary, secondary: T.text.secondary, tertiary: T.text.tertiary,
  success: T.category.green, danger: T.category.red, warning: "#e2b84a", info: T.accent.primary,
};

export function Text({ children, tone = "primary", size = "body", weight, italic, style }: Box & { tone?: string; size?: string; weight?: string; italic?: boolean; as?: string; truncate?: boolean }) {
  const fw = weight === "semibold" ? 600 : weight === "bold" ? 700 : weight === "medium" ? 500 : 400;
  return <div style={{ color: tones[tone] ?? T.text.primary, fontSize: size === "small" ? 12.5 : 14, lineHeight: 1.5, fontWeight: fw, fontStyle: italic ? "italic" : undefined, ...style }}>{children}</div>;
}

export const H1 = ({ children, style }: Box) => <h1 style={{ fontSize: 26, margin: 0, ...style }}>{children}</h1>;
export const H2 = ({ children, style }: Box) => <h2 style={{ fontSize: 20, margin: "4px 0 0", ...style }}>{children}</h2>;
export const H3 = ({ children, style }: Box) => <h3 style={{ fontSize: 16, margin: "4px 0 0", ...style }}>{children}</h3>;

export function Link({ children, href, style }: Box & { href: string }) {
  return <a href={href} target="_blank" rel="noreferrer" style={{ color: T.accent.primary, ...style }}>{children}</a>;
}

export function Pill({ children, active, onClick, disabled, style }: Box & { active?: boolean; onClick?: () => void; disabled?: boolean; size?: string }) {
  return (
    <button disabled={disabled} onClick={onClick}
      style={{ padding: "5px 12px", borderRadius: 999, border: `1px solid ${active ? T.accent.primary : T.stroke.secondary}`, background: active ? "rgba(110,168,254,0.18)" : "transparent", color: active ? T.text.primary : T.text.secondary, cursor: "pointer", fontSize: 13, ...style }}>
      {children}
    </button>
  );
}

export function Button({ children, variant = "primary", onClick, disabled, style }: Box & { variant?: string; onClick?: () => void; disabled?: boolean; type?: string }) {
  const primary = variant === "primary";
  return (
    <button disabled={disabled} onClick={onClick}
      style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${primary ? T.accent.primary : T.stroke.secondary}`, background: primary ? T.accent.primary : T.bg.chrome, color: primary ? "#0d1117" : T.text.primary, cursor: "pointer", fontSize: 13, fontWeight: primary ? 600 : 400, ...style }}>
      {children}
    </button>
  );
}

export function Stat({ value, label, tone, style }: { value: ReactNode; label: ReactNode; tone?: string; style?: CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 24, fontWeight: 700, color: tone ? tones[tone] : T.text.primary }}>{value}</div>
      <div style={{ fontSize: 12, color: T.text.tertiary }}>{label}</div>
    </div>
  );
}

export function Callout({ children, tone = "info", title, style }: Box & { tone?: string; title?: ReactNode; icon?: ReactNode }) {
  const c = tone === "neutral" ? T.text.tertiary : tones[tone] ?? T.accent.primary;
  return (
    <div style={{ borderLeft: `3px solid ${c}`, background: T.fill.tertiary, borderRadius: 6, padding: "10px 14px", fontSize: 14, lineHeight: 1.5, ...style }}>
      {title ? <div style={{ fontWeight: 600, marginBottom: 4, color: c }}>{title}</div> : null}
      <div>{children}</div>
    </div>
  );
}

export function Checkbox({ checked, onChange, label, disabled, style }: { checked?: boolean; onChange?: (v: boolean) => void; label?: ReactNode; disabled?: boolean; style?: CSSProperties }) {
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", fontSize: 14, lineHeight: 1.5, ...style }}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} style={{ marginTop: 4 }} />
      <span>{label}</span>
    </label>
  );
}

export function Select({ value, onChange, options, style }: { value?: string; onChange?: (v: string) => void; options: Array<{ value: string; label: string }>; placeholder?: string; disabled?: boolean; style?: CSSProperties }) {
  return (
    <select value={value} onChange={(e) => onChange?.(e.target.value)}
      style={{ background: T.bg.chrome, color: T.text.primary, border: `1px solid ${T.stroke.secondary}`, borderRadius: 6, padding: "5px 8px", fontSize: 13, ...style }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function TextInput({ value, onChange, placeholder, type = "text", style }: { value?: string; onChange?: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean; style?: CSSProperties }) {
  return (
    <input value={value} type={type} placeholder={placeholder} onChange={(e) => onChange?.(e.target.value)}
      style={{ background: T.bg.chrome, color: T.text.primary, border: `1px solid ${T.stroke.secondary}`, borderRadius: 6, padding: "5px 8px", fontSize: 13, width: "100%", ...style }} />
  );
}
