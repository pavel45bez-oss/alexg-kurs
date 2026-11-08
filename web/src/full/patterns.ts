export type C = [number, number, number, number];
export type Tone = "accent" | "green" | "red" | "muted";
export type Mark =
  | { t: "h"; n: number; y: number; from?: number; to?: number; label: string; tone?: Tone; dashed?: boolean }
  | { t: "zone"; n: number; y1: number; y2: number; from?: number; to?: number; label: string; tone?: Tone }
  | { t: "pt"; n: number; i: number; y: number; label: string; tone?: Tone; below?: boolean }
  | { t: "seg"; n: number; i1: number; y1: number; i2: number; y2: number; label: string; tone?: Tone; dashed?: boolean };

export type Pattern = { title: string; candles: C[]; marks: Mark[]; ema?: number; auto?: boolean; note?: string };

const K = (o: number, c: number, up = 1.6, dn = 1.6): C => [o, Math.max(o, c) + up, Math.min(o, c) - dn, c];
const path = (cl: number[], start: number): C[] => cl.map((c, i) => K(i ? cl[i - 1] : start, c));

const flipC = (cs: C[]): C[] => cs.map(([o, h, l, c]) => [100 - o, 100 - l, 100 - h, 100 - c]);
function flipM(ms: Mark[], labels: Record<number, string>): Mark[] {
  return ms.map((m) => {
    const label = labels[m.n] ?? m.label;
    const tone = m.tone === "green" ? "red" : m.tone === "red" ? "green" : m.tone;
    switch (m.t) {
      case "h": return { ...m, y: 100 - m.y, label, tone };
      case "zone": return { ...m, y1: 100 - m.y2, y2: 100 - m.y1, label, tone };
      case "pt": return { ...m, y: 100 - m.y, below: !m.below, label, tone };
      case "seg": return { ...m, y1: 100 - m.y1, y2: 100 - m.y2, label, tone };
    }
  });
}

const trendUp = path([30, 36, 42, 38, 34, 40, 48, 55, 50, 45, 52, 60, 67, 62, 57, 64, 72, 78], 26);

const brBuy: C[] = path([36, 44, 52, 46, 40, 47, 54, 48, 42, 50, 55, 63, 69, 64, 59, 57], 30)
  .concat([[57, 58, 53, 56.5], [56.5, 63, 55.5, 62]])
  .concat(path([70, 78, 86, 91], 62));
const brBuyMarks: Mark[] = [
  { t: "zone", n: 1, y1: 50, y2: 56, to: 11, label: "Зона интереса: 3 касания телами снизу (сопротивление)", tone: "accent" },
  { t: "pt", n: 2, i: 2, y: 52, label: "Касания зоны (локти по телам)" },
  { t: "pt", n: 2, i: 6, y: 54, label: "" },
  { t: "pt", n: 2, i: 10, y: 55, label: "" },
  { t: "pt", n: 3, i: 11, y: 63, label: "Пробой: тело свечи закрылось выше зоны" },
  { t: "zone", n: 4, y1: 50, y2: 56, from: 11, label: "Пробитая зона становится поддержкой", tone: "green" },
  { t: "pt", n: 5, i: 16, y: 53, label: "Ретест: цена вернулась к зоне сверху", below: true },
  { t: "pt", n: 6, i: 17, y: 63, label: "Бычье поглощение закрылось — вход после закрытия" },
  { t: "h", n: 7, y: 48, from: 15, label: "Стоп под зоной (там, где идея сломана)", tone: "red", dashed: true },
  { t: "h", n: 8, y: 90, from: 15, label: "Тейк минимум 1:2", tone: "green", dashed: true },
];

const hs: C[] = path([38, 46, 54, 48, 42, 50, 60, 70, 62, 52, 44, 50, 58, 52, 45, 40, 44, 47], 30)
  .concat([[47, 48.5, 38, 39]])
  .concat(path([33, 27, 20, 15], 39));
const hsMarks: Mark[] = [
  { t: "pt", n: 1, i: 2, y: 54, label: "Левое плечо" },
  { t: "pt", n: 2, i: 7, y: 70, label: "Голова — самая высокая вершина" },
  { t: "pt", n: 3, i: 12, y: 58, label: "Правое плечо — ниже головы" },
  { t: "zone", n: 4, y1: 42, y2: 46, label: "Шея: горизонталь по последнему HL. Это тоже зона интереса", tone: "accent" },
  { t: "pt", n: 5, i: 15, y: 40, label: "Пробой шеи телом = слом структуры, фигура подтверждена", below: true },
  { t: "pt", n: 6, i: 17, y: 47, label: "Ретест шеи снизу" },
  { t: "pt", n: 7, i: 18, y: 37, label: "Медвежье поглощение — вход в продажу", below: true },
  { t: "h", n: 8, y: 51, from: 15, label: "Стоп над ретестом", tone: "red", dashed: true },
  { t: "h", n: 9, y: 17, from: 15, label: "Тейк минимум 1:2", tone: "green", dashed: true },
];

const dt: C[] = path([40, 50, 60, 66, 58, 50, 46, 54, 62, 66.5, 58, 48, 42, 46, 47.5], 30)
  .concat([[47.5, 49, 39, 40]])
  .concat(path([34, 28, 22, 18], 40));
const dtMarks: Mark[] = [
  { t: "zone", n: 1, y1: 62, y2: 67, label: "Сопротивление (зона интереса)", tone: "accent" },
  { t: "pt", n: 2, i: 3, y: 66, label: "Первая вершина" },
  { t: "pt", n: 3, i: 9, y: 66.5, label: "Вторая вершина — снова отказ от зоны" },
  { t: "zone", n: 4, y1: 44, y2: 48, label: "Шея: минимум между вершинами", tone: "muted" },
  { t: "pt", n: 5, i: 12, y: 42, label: "Пробой шеи телом — фигура подтверждена", below: true },
  { t: "pt", n: 6, i: 14, y: 47.5, label: "Ретест шеи" },
  { t: "pt", n: 7, i: 15, y: 38, label: "Поглощение — вход", below: true },
  { t: "h", n: 8, y: 51, from: 12, label: "Стоп", tone: "red", dashed: true },
  { t: "h", n: 9, y: 18, from: 12, label: "Тейк 1:2", tone: "green", dashed: true },
];

const engBull: C[] = path([64, 58, 52, 46, 40, 36, 33.5], 70).concat([[33, 45, 32, 44]]).concat(path([50, 56], 44));
const engBullMarks: Mark[] = [
  { t: "zone", n: 1, y1: 30, y2: 36, label: "Поддержка — зона интереса", tone: "accent" },
  { t: "seg", n: 2, i1: 5, y1: 42, i2: 6, y2: 42, label: "Две последние медвежьи свечи" },
  { t: "pt", n: 3, i: 7, y: 45, label: "Бычье поглощение: тело перекрыло тела двух прошлых свечей" },
  { t: "pt", n: 4, i: 8, y: 50, label: "Вход только после закрытия поглощения" },
];

const doji: C[] = path([64, 58, 52, 46, 40, 35], 70).concat([[35, 39, 31, 35.3]]).concat(path([42, 48], 35.3));
const dojiMarks: Mark[] = [
  { t: "zone", n: 1, y1: 30, y2: 36, label: "Поддержка — зона интереса", tone: "accent" },
  { t: "pt", n: 2, i: 6, y: 39, label: "Доджи: открытие почти равно закрытию — рынок затормозил" },
  { t: "pt", n: 3, i: 7, y: 43, label: "Следующая бычья свеча — подтверждение" },
];

const hammer: C[] = path([64, 58, 52, 46, 40, 37], 70).concat([[37, 39.5, 27, 38.5]]).concat(path([44, 50], 38.5));
const hammerMarks: Mark[] = [
  { t: "zone", n: 1, y1: 30, y2: 36, label: "Поддержка — зона интереса", tone: "accent" },
  { t: "pt", n: 2, i: 6, y: 27, label: "Молот: длинный хвост вниз, тело наверху — продавцов выкупили", below: true },
  { t: "pt", n: 3, i: 7, y: 45, label: "Продолжение вверх" },
];

const mstar: C[] = path([66, 60, 54, 48], 72).concat([[48, 49, 35, 36], [36, 37.5, 33, 35.5], [35.5, 48, 34.5, 47]]).concat(path([53, 58], 47));
const mstarMarks: Mark[] = [
  { t: "zone", n: 1, y1: 30, y2: 37, label: "Поддержка — зона интереса", tone: "accent" },
  { t: "pt", n: 2, i: 4, y: 49, label: "1-я свеча: сильная медвежья" },
  { t: "pt", n: 3, i: 5, y: 33, label: "2-я свеча: маленькая (звезда) — нерешительность", below: true },
  { t: "pt", n: 4, i: 6, y: 48, label: "3-я свеча: сильная бычья — подтверждение" },
];

const sweep: C[] = path([60, 54, 48, 44, 50, 56, 50, 45, 52, 58, 51], 64)
  .concat([[51, 52, 33, 44]])
  .concat(path([50, 56, 62], 44));
const sweepMarks: Mark[] = [
  { t: "zone", n: 1, y1: 42, y2: 47, label: "Поддержка с касаниями", tone: "accent" },
  { t: "pt", n: 2, i: 11, y: 33, label: "Хвост ниже зоны — сбор ликвидности (ложный пробой)", below: true },
  { t: "pt", n: 3, i: 11, y: 52, label: "Тело закрылось обратно в зоне — пробоя нет" },
];

const cons: C[] = path([50, 56, 59, 54, 46, 42, 47, 55, 58.5, 52, 45, 41.5, 48, 56, 59], 44);
const consMarks: Mark[] = [
  { t: "zone", n: 1, y1: 56, y2: 60, label: "Верх боковика", tone: "red" },
  { t: "zone", n: 2, y1: 40, y2: 44, label: "Низ боковика", tone: "green" },
  { t: "seg", n: 3, i1: 0, y1: 50, i2: 14, y2: 50, label: "Внутри боковика не торгуем — ждём пробой телом и ретест", tone: "muted", dashed: true },
];

const rrLong: C[] = path([60, 54, 48, 43, 40], 66).concat([[40, 45, 38.5, 44]]).concat(path([49, 54, 58, 63, 68], 44));
const rrLongMarks: Mark[] = [
  { t: "h", n: 1, y: 44, from: 5, label: "Вход", tone: "accent" },
  { t: "h", n: 2, y: 37, from: 5, label: "Стоп: риск = 1 (7 единиц)", tone: "red", dashed: true },
  { t: "h", n: 3, y: 58, from: 5, label: "Тейк 1:2 (прибыль 14 = 2 риска)", tone: "green", dashed: true },
  { t: "h", n: 4, y: 72, from: 5, label: "Потенциал 1:4 — «вторая сделка бесплатно»", tone: "green", dashed: true },
];

const emaC: C[] = path([30, 35, 40, 46, 52, 49, 46, 50, 56, 62, 68, 64, 60, 57.5], 26)
  .concat([[57.5, 64, 56, 63]])
  .concat(path([68, 73, 78], 63));
const emaMarks: Mark[] = [
  { t: "zone", n: 1, y1: 55, y2: 60, label: "Зона интереса (бывшая вершина = поддержка)", tone: "accent" },
  { t: "pt", n: 2, i: 13, y: 54, label: "Откат в зону и к EMA одновременно — два совпадения", below: true },
  { t: "pt", n: 3, i: 14, y: 65, label: "Бычье поглощение — вход" },
];

export const PATTERNS: Record<string, Pattern> = {
  "trend-up": { title: "Восходящий тренд: HH и HL", candles: trendUp, marks: [], auto: true, note: "Номера ставятся по закрытиям тел. Каждая новая вершина выше прошлой (HH), каждый откат выше прошлого (HL)." },
  "trend-down": { title: "Нисходящий тренд: LL и LH", candles: flipC(trendUp), marks: [], auto: true, note: "Каждый минимум ниже прошлого (LL), каждый откат вверх ниже прошлого (LH)." },
  "shift-of-structure": {
    title: "Слом структуры",
    candles: path([30, 38, 46, 41, 37, 45, 55, 62, 56, 50, 57, 66, 60, 54, 47, 40, 46, 51, 44, 36], 26),
    marks: [
      { t: "h", n: 90, y: 50, from: 9, label: "Последний HL — линия слома тренда", tone: "red", dashed: true },
      { t: "pt", n: 91, i: 14, y: 45, label: "Тело закрылось ниже последнего HL — тренд сменился на нисходящий", below: true },
    ],
    auto: true,
  },
  "pullback-elbows": {
    title: "Какой откат считается локтем",
    candles: path([30, 35, 40, 45, 44, 49, 54, 58, 53, 48, 55, 62], 26),
    marks: [
      { t: "pt", n: 1, i: 4, y: 42, label: "Крошечный откат на одну свечу — не локоть, не считаем", below: true, tone: "muted" },
      { t: "pt", n: 2, i: 7, y: 60, label: "Вершина — HH" },
      { t: "pt", n: 3, i: 9, y: 46, label: "Настоящий откат телами — локоть, это HL", below: true, tone: "green" },
    ],
  },
  "break-retest-buy": { title: "Пробой и ретест: покупка", candles: brBuy, marks: brBuyMarks },
  "break-retest-sell": {
    title: "Пробой и ретест: продажа",
    candles: flipC(brBuy),
    marks: flipM(brBuyMarks, {
      1: "Зона интереса: 3 касания телами сверху (поддержка)",
      3: "Пробой: тело свечи закрылось ниже зоны",
      4: "Пробитая зона становится сопротивлением",
      5: "Ретест: цена вернулась к зоне снизу",
      6: "Медвежье поглощение закрылось — вход после закрытия",
      7: "Стоп над зоной",
    }),
  },
  "head-shoulders": { title: "Голова и плечи", candles: hs, marks: hsMarks },
  "inverse-head-shoulders": {
    title: "Перевёрнутая голова и плечи",
    candles: flipC(hs),
    marks: flipM(hsMarks, {
      2: "Голова — самый низкий минимум",
      3: "Правое плечо — выше головы",
      4: "Шея: горизонталь по последнему LH. Это тоже зона интереса",
      5: "Пробой шеи телом вверх = слом структуры",
      6: "Ретест шеи сверху",
      7: "Бычье поглощение — вход в покупку",
      8: "Стоп под ретестом",
    }),
  },
  "double-top": { title: "Двойная вершина", candles: dt, marks: dtMarks },
  "double-bottom": {
    title: "Двойное дно",
    candles: flipC(dt),
    marks: flipM(dtMarks, { 1: "Поддержка (зона интереса)", 2: "Первое дно", 3: "Второе дно — снова отказ от зоны", 4: "Шея: максимум между доньями", 5: "Пробой шеи телом вверх" }),
  },
  "engulfing-bull": { title: "Бычье поглощение", candles: engBull, marks: engBullMarks },
  "engulfing-bear": {
    title: "Медвежье поглощение",
    candles: flipC(engBull),
    marks: flipM(engBullMarks, { 1: "Сопротивление — зона интереса", 2: "Две последние бычьи свечи", 3: "Медвежье поглощение: тело перекрыло тела двух прошлых свечей" }),
  },
  doji: { title: "Доджи", candles: doji, marks: dojiMarks },
  hammer: { title: "Молот", candles: hammer, marks: hammerMarks },
  "shooting-star": {
    title: "Падающая звезда",
    candles: flipC(hammer),
    marks: flipM(hammerMarks, { 1: "Сопротивление — зона интереса", 2: "Длинный хвост вверх, тело внизу — покупателей продавили", 3: "Продолжение вниз" }),
  },
  "morning-star": { title: "Утренняя звезда", candles: mstar, marks: mstarMarks, note: "Вечерняя звезда — то же самое зеркально, для продаж." },
  "liquidity-sweep": { title: "Сбор ликвидности (ложный пробой)", candles: sweep, marks: sweepMarks },
  consolidation: { title: "Боковик", candles: cons, marks: consMarks },
  "rr-long": { title: "Риск к прибыли: покупка", candles: rrLong, marks: rrLongMarks },
  "rr-short": {
    title: "Риск к прибыли: продажа",
    candles: flipC(rrLong),
    marks: flipM(rrLongMarks, {}),
  },
  "ema-confluence": { title: "EMA 50 + зона", candles: emaC, marks: emaMarks, ema: 8, note: "На схеме сглаженная линия показывает идею EMA 50; на реальном графике это EMA с периодом 50 по закрытиям." },
};
