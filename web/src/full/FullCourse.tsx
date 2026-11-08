import { useEffect, useMemo, useState } from "react";
import { Button, Callout, Card, CardBody, CardHeader, Divider, H1, H2, H3, Link, Pill, Row, Stack, Text, useCanvasState, useHostTheme } from "../canvas-shim";
import A from "../../../data/full/lessons/A.json";
import B from "../../../data/full/lessons/B.json";
import Cc from "../../../data/full/lessons/C.json";
import D from "../../../data/full/lessons/D.json";
import E from "../../../data/full/lessons/E.json";
import F from "../../../data/full/lessons/F.json";
import { LessonChart, StructureReal, ZonesReal } from "./charts";
import { PATTERNS } from "./patterns";

type ChartSpec = { kind: string; pattern?: string; whyRu?: string };
type Quiz = { q: string; options: string[]; answer: number; why: string };
type Lesson = {
  id: string; chapter: string; titleRu: string; summaryRu: string[];
  rules: { ru: string; quoteEn?: string; quoteRu?: string }[];
  mistakes: string[]; examples: { ru: string }[];
  chart: ChartSpec; extraCharts?: ChartSpec[];
  sessionsRu?: { name: string; hours: string; noteRu: string }[];
  checklistRu?: string[];
  glossary: { term: string; ru: string }[];
  quiz: Quiz[];
};

const ALL = [...A, ...B, ...Cc, ...D, ...E, ...F] as unknown as Lesson[];
const BY_ID = new Map(ALL.map((l) => [l.id, l]));
const VIDEO = "https://www.youtube.com/watch?v=grw58BIzotU";

const MODULES: { t: string; ids: string[] }[] = [
  { t: "Старт: рынок и мышление", ids: ["introduction", "personal-backstory", "preparation-mindset", "understanding-markets", "busting-trading-myths", "types-of-traders"] },
  { t: "Пары, графики, таймфреймы", ids: ["forex-pairs", "types-of-charts", "timeframes-and-candlesticks"] },
  { t: "Торговые сессии", ids: ["trading-sessions"] },
  { t: "Платформы: брокер, MT5, TradingView", ids: ["trading-platforms", "live-broker-mt5-setup", "metatrader-execution-and-lot-size", "tradingview-setup-no-gap-candles-timeframes", "tradingview-indicators-alerts-watchlist", "tradingview-drawing-tools-backtesting", "tradingview-toolkit-and-pips", "mt5-orders-and-lot-size"] },
  { t: "Фундаментальный и технический анализ", ids: ["fundamental-vs-technical-analysis"] },
  { t: "Структура рынка и тренд", ids: ["price-action-market-structure-snake-trick", "real-time-structure-practice-and-live-trades", "structure-on-candlesticks-confirmation", "reading-structure-line-and-candles", "top-down-analysis"] },
  { t: "Зоны интереса (поддержка и сопротивление)", ids: ["area-of-interest-basics", "area-of-interest-placement"] },
  { t: "Пробой и ретест", ids: ["break-of-structure-and-break-retest"] },
  { t: "Свечные подтверждения", ids: ["indecision-and-rejection-candles", "engulfing-morning-evening-star"] },
  { t: "Голова и плечи", ids: ["head-and-shoulders", "head-shoulders-confirmation-examples"] },
  { t: "EMA 50 и чек-лист конфлюенсов", ids: ["ema-50-indicator", "confluence-trading-checklist", "nzdusd-live-trade-breakdown"] },
  { t: "Риск и мани-менеджмент", ids: ["money-management-why-traders-fail", "risk-to-reward-minimum-1-2", "account-flipping-risk-ladder", "one-trade-per-week-selection", "lot-size-slippage-broker"] },
  { t: "Челлендж $100 → $1M: разбор недель", ids: ["challenge-weeks-1-2", "challenge-weeks-3-6-discipline", "challenge-weeks-8-14-scaling"] },
  { t: "Заключение", ids: ["conclusion-immersion-not-too-late"] },
];
const ORDER = MODULES.flatMap((m) => m.ids).filter((id) => BY_ID.has(id));
const RISKY = new Set(["account-flipping-risk-ladder", "challenge-weeks-1-2", "challenge-weeks-3-6-discipline", "challenge-weeks-8-14-scaling", "money-management-why-traders-fail"]);

function QuizBlock({ id, quiz }: { id: string; quiz: Quiz[] }) {
  const T = useHostTheme();
  const [ans, setAns] = useCanvasState<Record<string, number>>(`full:quiz:${id}`, {});
  const done = quiz.filter((_, i) => ans[i] !== undefined).length;
  const right = quiz.filter((q, i) => ans[i] === q.answer).length;
  return (
    <Stack gap={12}>
      {quiz.map((q, i) => {
        const a = ans[i];
        return (
          <Stack key={i} gap={6}>
            <Text weight="semibold">{i + 1}. {q.q}</Text>
            {q.options.map((o, j) => {
              const picked = a === j;
              const show = a !== undefined;
              const col = show && j === q.answer ? T.category.green : picked ? T.category.red : T.stroke.secondary;
              return (
                <button key={j} disabled={show} onClick={() => setAns({ ...ans, [i]: j })}
                  style={{ textAlign: "left", padding: "7px 10px", borderRadius: 6, border: `1px solid ${col}`, background: show && (picked || j === q.answer) ? T.fill.tertiary : "transparent", color: T.text.primary, cursor: show ? "default" : "pointer", fontSize: 13.5 }}>
                  {String.fromCharCode(65 + j)}. {o}
                </button>
              );
            })}
            {a !== undefined ? <Callout tone={a === q.answer ? "success" : "danger"} title={a === q.answer ? "Верно" : "Неверно"}>{q.why}</Callout> : null}
          </Stack>
        );
      })}
      <Row gap={10} align="center">
        <Text tone="secondary">Отвечено {done} из {quiz.length}, верно {right}</Text>
        {done ? <Button variant="secondary" onClick={() => setAns({})}>Пройти заново</Button> : null}
      </Row>
    </Stack>
  );
}

function ChartCard({ c, idx }: { c: ChartSpec; idx: number }) {
  if (!c || c.kind === "none") return null;
  return (
    <Card>
      <CardHeader>График {idx}</CardHeader>
      <CardBody>
        <Stack gap={8}>
          {c.whyRu ? <Text tone="secondary" size="small">{c.whyRu}</Text> : null}
          <LessonChart kind={c.kind} pattern={c.pattern || undefined} />
        </Stack>
      </CardBody>
    </Card>
  );
}

function LessonView({ l, done, onDone, onNext, onPrev, num }: { l: Lesson; done: boolean; onDone: (v: boolean) => void; onNext?: () => void; onPrev?: () => void; num: string }) {
  const T = useHostTheme();
  const [showEn, setShowEn] = useCanvasState("full:showEn", true);
  const charts = [l.chart, ...(l.extraCharts ?? [])].filter((c) => c && c.kind !== "none");
  return (
    <Stack gap={16}>
      <Stack gap={4}>
        <Text tone="tertiary" size="small">Урок {num} · глава видео «{l.chapter}»</Text>
        <H1>{l.titleRu}</H1>
      </Stack>
      {RISKY.has(l.id) ? (
        <Callout tone="warning" title="Про риск в челлендже">Алекс разгонял счёт с риском вплоть до 100% на сделку и сам говорит, что так делать не рекомендует. Здесь это разобрано как история, а не как инструкция. Для обычного счёта он называет 3–5%; чаще советуют 1–2%.</Callout>
      ) : null}
      <Stack gap={8}>
        {l.summaryRu.map((p, i) => <Text key={i} style={{ fontSize: 15, lineHeight: 1.6 }}>{p}</Text>)}
      </Stack>

      {charts.map((c, i) => <ChartCard key={i} c={c} idx={i + 1} />)}

      {l.sessionsRu?.length ? (
        <Card><CardHeader>Сессии его словами</CardHeader><CardBody><Stack gap={8}>
          {l.sessionsRu.map((s, i) => (
            <Stack key={i} gap={2}>
              <Text weight="semibold">{i + 1}. {s.name}</Text>
              <Text tone="secondary" size="small">{s.hours}</Text>
              <Text>{s.noteRu}</Text>
            </Stack>
          ))}
        </Stack></CardBody></Card>
      ) : null}

      {l.rules.length ? (
        <Card>
          <CardHeader trailing={<Pill active={showEn} onClick={() => setShowEn(!showEn)}>Цитаты EN</Pill>}>Правила урока</CardHeader>
          <CardBody>
            <Stack gap={10}>
              {l.rules.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 10 }}>
                  <span style={{ flex: "0 0 22px", height: 22, borderRadius: 11, background: T.fill.tertiary, color: T.accent.primary, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                  <Stack gap={2}>
                    <Text>{r.ru}</Text>
                    {r.quoteRu ? <Text tone="secondary" size="small">Алекс: «{r.quoteRu}»</Text> : null}
                    {showEn && r.quoteEn ? <Text tone="tertiary" size="small" italic>“{r.quoteEn}”</Text> : null}
                  </Stack>
                </div>
              ))}
            </Stack>
          </CardBody>
        </Card>
      ) : null}

      {l.checklistRu?.length ? (
        <Card><CardHeader>Чек-лист</CardHeader><CardBody><Stack gap={4}>{l.checklistRu.map((c, i) => <Text key={i}>☐ {c}</Text>)}</Stack></CardBody></Card>
      ) : null}

      {l.mistakes.length ? (
        <Card><CardHeader>Типичные ошибки</CardHeader><CardBody><Stack gap={6}>{l.mistakes.map((m, i) => <Text key={i}><span style={{ color: T.category.red }}>✕</span> {m}</Text>)}</Stack></CardBody></Card>
      ) : null}

      {l.examples.length ? (
        <Card><CardHeader>Примеры из видео</CardHeader><CardBody><Stack gap={6}>{l.examples.map((e, i) => <Text key={i}>• {e.ru}</Text>)}</Stack></CardBody></Card>
      ) : null}

      {l.glossary.length ? (
        <Card><CardHeader>Термины</CardHeader><CardBody><Stack gap={4}>{l.glossary.map((g, i) => <Text key={i}><b>{g.term}</b> — {g.ru}</Text>)}</Stack></CardBody></Card>
      ) : null}

      {l.quiz.length ? (
        <Card><CardHeader>Проверь себя</CardHeader><CardBody><QuizBlock id={l.id} quiz={l.quiz} /></CardBody></Card>
      ) : null}

      <Row gap={10} wrap align="center">
        {onPrev ? <Button variant="secondary" onClick={onPrev}>← Назад</Button> : null}
        <Button variant={done ? "secondary" : "primary"} onClick={() => onDone(!done)}>{done ? "✓ Пройден (снять отметку)" : "Отметить пройденным"}</Button>
        {onNext ? <Button onClick={() => { if (!done) onDone(true); onNext(); }}>Дальше →</Button> : null}
      </Row>
    </Stack>
  );
}

function shuffle<X>(a: X[], seed: number) {
  const r = [...a];
  let s = seed;
  for (let i = r.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

function Exam() {
  const [seed, setSeed] = useCanvasState("full:exam:seed", 7);
  const pool = useMemo(() => ALL.flatMap((l) => l.quiz.map((q) => ({ ...q, from: l.titleRu }))), []);
  const qs = useMemo(() => shuffle(pool, seed).slice(0, 25), [pool, seed]);
  return (
    <Stack gap={12}>
      <H1>Итоговый экзамен</H1>
      <Text tone="secondary">25 случайных вопросов из {pool.length} по всем урокам. Кнопка ниже меняет набор.</Text>
      <Button variant="secondary" onClick={() => setSeed(Math.floor(Math.random() * 100000))}>Новый набор вопросов</Button>
      <QuizBlock key={seed} id={`exam-${seed}`} quiz={qs} />
    </Stack>
  );
}

function Gallery() {
  const [p, setP] = useCanvasState("full:gal:p", "break-retest-buy");
  return (
    <Stack gap={14}>
      <H1>Тренажёр графиков</H1>
      <Text tone="secondary">Все схемы курса и реальные графики 28 пар. Наводите на номер на графике или в легенде — соответствующая линия подсветится.</Text>
      <Row gap={6} wrap>{Object.entries(PATTERNS).map(([k, v]) => <Pill key={k} active={p === k} onClick={() => setP(k)}>{v.title}</Pill>)}</Row>
      <Card><CardBody><LessonChart kind="pattern" pattern={p} /></CardBody></Card>
      <H2>Структура на реальном графике</H2>
      <Card><CardBody><StructureReal /></CardBody></Card>
      <H2>Зоны на реальном графике</H2>
      <Card><CardBody><ZonesReal /></CardBody></Card>
    </Stack>
  );
}

export default function FullCourse() {
  const T = useHostTheme();
  const [cur, setCur] = useCanvasState<string>("full:cur", "home");
  const [done, setDone] = useCanvasState<Record<string, boolean>>("full:done", {});
  const [open, setOpen] = useState<Record<number, boolean>>({});
  useEffect(() => { window.scrollTo(0, 0); }, [cur]);
  const total = ORDER.length;
  const nDone = ORDER.filter((id) => done[id]).length;
  const idx = ORDER.indexOf(cur);
  const numOf = (id: string) => {
    for (let m = 0; m < MODULES.length; m++) { const k = MODULES[m].ids.indexOf(id); if (k >= 0) return `${m + 1}.${k + 1}`; }
    return "";
  };
  const curModule = MODULES.findIndex((m) => m.ids.includes(cur));

  const side = (
    <div style={{ position: "sticky", top: 12, maxHeight: "calc(100vh - 24px)", overflowY: "auto", paddingRight: 6 }}>
      <Stack gap={4}>
        <Pill active={cur === "home"} onClick={() => setCur("home")} style={{ textAlign: "left" }}>Обзор курса</Pill>
        <Pill active={cur === "gallery"} onClick={() => setCur("gallery")} style={{ textAlign: "left" }}>Тренажёр графиков</Pill>
        <Pill active={cur === "exam"} onClick={() => setCur("exam")} style={{ textAlign: "left" }}>Итоговый экзамен</Pill>
        <div style={{ height: 6 }} />
        {MODULES.map((m, mi) => {
          const ids = m.ids.filter((id) => BY_ID.has(id));
          const d = ids.filter((id) => done[id]).length;
          const isOpen = open[mi] ?? mi === curModule;
          return (
            <div key={mi}>
              <div onClick={() => setOpen({ ...open, [mi]: !isOpen })} style={{ cursor: "pointer", padding: "6px 4px", fontSize: 13, fontWeight: 600, color: d === ids.length ? T.category.green : T.text.primary, display: "flex", justifyContent: "space-between", gap: 6 }}>
                <span>{mi + 1}. {m.t}</span><span style={{ color: T.text.tertiary, fontWeight: 400 }}>{d}/{ids.length}</span>
              </div>
              {isOpen ? ids.map((id, k) => (
                <div key={id} onClick={() => setCur(id)} style={{ cursor: "pointer", padding: "4px 6px 4px 16px", fontSize: 12.5, borderRadius: 6, background: cur === id ? "rgba(110,168,254,0.16)" : "transparent", color: done[id] ? T.category.green : T.text.secondary }}>
                  {done[id] ? "✓ " : ""}{mi + 1}.{k + 1} {BY_ID.get(id)!.titleRu}
                </div>
              )) : null}
            </div>
          );
        })}
      </Stack>
    </div>
  );

  let main;
  if (cur === "exam") main = <Exam />;
  else if (cur === "gallery") main = <Gallery />;
  else if (BY_ID.has(cur)) {
    main = (
      <LessonView key={cur} l={BY_ID.get(cur)!} num={numOf(cur)} done={!!done[cur]} onDone={(v) => setDone({ ...done, [cur]: v })}
        onPrev={idx > 0 ? () => setCur(ORDER[idx - 1]) : undefined}
        onNext={idx < ORDER.length - 1 ? () => setCur(ORDER[idx + 1]) : undefined} />
    );
  } else {
    main = (
      <Stack gap={14}>
        <H1>Полный курс FX Alex G</H1>
        <Text style={{ fontSize: 15 }}>Конспект 10-часового бесплатного курса Алекса «The Trading Industry Will Hate Me for This FREE 10+ Hour Course»: {total} урока в 14 модулях. Внутри каждого урока: пересказ, правила с его цитатами (русский перевод и оригинал), ошибки, примеры из видео, термины, тест и графики с пронумерованными линиями.</Text>
        <Row gap={8} wrap>
          <Button onClick={() => setCur(ORDER.find((id) => !done[id]) ?? ORDER[0])}>{nDone ? "Продолжить" : "Начать с первого урока"}</Button>
          <Button variant="secondary" onClick={() => setCur("gallery")}>Тренажёр графиков</Button>
          <Link href={VIDEO}>Видео на YouTube</Link>
        </Row>
        <Text tone="secondary">Пройдено {nDone} из {total}</Text>
        <div style={{ height: 6, background: T.fill.tertiary, borderRadius: 3 }}><div style={{ width: `${(nDone / total) * 100}%`, height: 6, background: T.category.green, borderRadius: 3 }} /></div>
        <Callout title="Как читать графики">У каждой линии, зоны и точки есть номер в кружке. Под графиком легенда: номер — что это значит. Наведите на номер (или кликните строку легенды), и нужный элемент подсветится, остальные потускнеют. Схемы нарисованы вручную по правилам Алекса, реальные графики — данные OANDA по 28 парам.</Callout>
        <Callout tone="neutral" title="Что важно знать">Пересказ и переводы мои, цитаты в кавычках — слова Алекса из расшифровки. Время в видео не указано: главы YouTube не совпадают с содержанием, а точных таймкодов у меня нет. Это учебный материал, не торговая рекомендация.</Callout>
        <Divider />
        {MODULES.map((m, mi) => (
          <Stack key={mi} gap={4}>
            <H3>{mi + 1}. {m.t}</H3>
            {m.ids.filter((id) => BY_ID.has(id)).map((id, k) => (
              <div key={id} onClick={() => setCur(id)} style={{ cursor: "pointer", fontSize: 13.5, color: done[id] ? T.category.green : T.text.secondary, paddingLeft: 12 }}>
                {done[id] ? "✓ " : ""}{mi + 1}.{k + 1} {BY_ID.get(id)!.titleRu}
              </div>
            ))}
          </Stack>
        ))}
      </Stack>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 290px) minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
      {side}
      <div style={{ maxWidth: 900 }}>{main}</div>
    </div>
  );
}
