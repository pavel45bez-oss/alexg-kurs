type FxTf = { bars: string; opts: number[][]; ans: number; good: number[][] };
type FxItem = { pair: string; jpy: boolean; W: FxTf; D: FxTf };

// OANDA, дневные свечи 300 дней до 03.11.2026; недели собраны из дней. Снято с TradingView.
const FX: FxItem[] = /*FX_DATA*/ [];

const LETTERS = ["A", "B", "C", "D"];
const decodeCache: Record<string, Bar[]> = {};
function decodeBars(key: string, s: string, jpy: boolean): Bar[] {
  if (decodeCache[key]) return decodeCache[key];
  const k = jpy ? 1000 : 100000;
  const out = s.split(";").map((r) => {
    const [d, o, h, l, c] = r.split(":");
    return [`${d.slice(0, 2)}.${d.slice(2)}`, +o / k, +h / k, +l / k, +c / k] as Bar;
  });
  decodeCache[key] = out;
  return out;
}

function verdict(st: { width: number; taps: number }) {
  if (st.width > 60) return `шире 60 пипсов (${st.width})`;
  if (st.taps < 3) return `разворотов в зоне ${st.taps}, нужно минимум 3`;
  return `${st.width} пипсов, разворотов ${st.taps} — проходит`;
}

function Tests() {
  const [pairIdx, setPairIdx] = useCanvasState("t-pair", 0);
  const [tf, setTf] = useCanvasState<"W" | "D">("t-tf", "W");
  const [mode, setMode] = useCanvasState<"pick" | "build">("t-mode", "pick");
  const [picks, setPicks] = useCanvasState<Record<string, number>>("t-picks", {});
  const [builds, setBuilds] = useCanvasState<Record<string, { lo: number; hi: number; ok: boolean }>>("t-builds", {});
  const [draft, setDraft] = useCanvasState<Record<string, Zone>>("t-draft", {});
  if (FX.length === 0) return <Text>Нет данных.</Text>;
  const item = FX[Math.min(pairIdx, FX.length - 1)];
  const t = item[tf];
  const key = `${item.pair}-${tf}`;
  const pip = item.jpy ? 0.01 : 0.0001;
  const bars = decodeBars(key, t.bars, item.jpy);
  const total = FX.length * 2;
  const pickedRight = Object.entries(picks).filter(([k, v]) => {
    const [p, f] = k.split("-");
    const it = FX.find((x) => x.pair === p);
    return it ? it[f as "W" | "D"].ans === v : false;
  }).length;
  const builtRight = Object.values(builds).filter((b) => b.ok).length;
  const next = () => {
    if (tf === "W") setTf("D");
    else {
      setTf("W");
      setPairIdx((pairIdx + 1) % FX.length);
    }
  };
  const tfName = tf === "W" ? "неделя" : "день";
  const caption = `${item.pair}, ${tfName}. Ось Y: цена. Ось X: дата (сен 2025 – ноя 2026). Источник: OANDA через TradingView.`;

  let body: JSX.Element;
  if (mode === "pick") {
    const chosen = picks[key];
    const answered = chosen !== undefined;
    const stats = t.opts.map((o) => zoneStats(bars, { lo: o[0], hi: o[1] }, pip));
    const bands: Band[] = t.opts.map((o, i) => ({
      lo: o[0], hi: o[1], label: LETTERS[i],
      kind: !answered ? "zone" : i === t.ans ? "ok" : i === chosen ? "bad" : "muted",
    }));
    const okIdx = answered && t.ans >= 0 ? stats[t.ans].tapIdx : [];
    body = (
      <Stack gap={12}>
        <Text tone="secondary">Какая из зон правильная по правилам Алекса: не шире 60 пипсов и минимум 3 разворота закрытием внутри?</Text>
        <CandleChart bars={bars} zones={bands} tapIdx={okIdx} title={item.pair} pip={pip} caption={caption} />
        <Row gap={8} wrap>
          {t.opts.map((o, i) => (
            <Pill key={i} active={chosen === i} onClick={() => setPicks({ ...picks, [key]: i })}>
              {`${LETTERS[i]}: ${fmt(o[0] * pip, pip)}–${fmt(o[1] * pip, pip)}`}
            </Pill>
          ))}
        </Row>
        {answered ? (
          <Callout tone={chosen === t.ans ? "success" : "danger"} title={chosen === t.ans ? "Верно" : `Неверно, правильная — ${LETTERS[t.ans]}`}>
            <Stack gap={4}>
              {t.opts.map((o, i) => (
                <Text key={i} size="small">{`${LETTERS[i]}: ${verdict(stats[i])}${stats[i].through ? `, насквозь прошли ${stats[i].through}` : ""}.`}</Text>
              ))}
              <Text size="small" tone="secondary">Точки над свечами — развороты в правильной зоне.</Text>
            </Stack>
          </Callout>
        ) : null}
      </Stack>
    );
  } else {
    const last = bars[bars.length - 1][4] / pip;
    const start: Zone = { lo: Math.round(last / 5) * 5 - 25, hi: Math.round(last / 5) * 5 + 25 };
    const z = draft[key] ?? start;
    const st = zoneStats(bars, z, pip);
    const result = builds[key];
    const set = (nz: Zone) => { if (nz.hi - nz.lo >= 5) setDraft({ ...draft, [key]: nz }); };
    const bands: Band[] = [{ ...z, kind: "zone", label: "ты" }];
    if (result) t.good.forEach((g, i) => bands.push({ lo: g[0], hi: g[1], kind: "hint", label: String(i + 1) }));
    body = (
      <Stack gap={12}>
        <Text tone="secondary">Найди сам зону с минимум 3 разворотами, не шире 60 пипсов. Двигай зону, потом нажми «Сдать». После сдачи пунктиром покажутся лучшие зоны, найденные программой.</Text>
        <CandleChart bars={bars} zones={bands} tapIdx={st.tapIdx} title={item.pair} pip={pip} caption={caption} />
        <Row gap={8} wrap align="center">
          <Text size="small" tone="secondary">Вся зона</Text>
          <Button variant="secondary" onClick={() => set({ lo: z.lo + 50, hi: z.hi + 50 })}>↑ 50 п.</Button>
          <Button variant="secondary" onClick={() => set({ lo: z.lo + 10, hi: z.hi + 10 })}>↑ 10</Button>
          <Button variant="secondary" onClick={() => set({ lo: z.lo - 10, hi: z.hi - 10 })}>↓ 10</Button>
          <Button variant="secondary" onClick={() => set({ lo: z.lo - 50, hi: z.hi - 50 })}>↓ 50 п.</Button>
          <Text size="small" tone="secondary">{`Верх ${fmt(z.hi * pip, pip)}`}</Text>
          <Button variant="secondary" onClick={() => set({ ...z, hi: z.hi + 5 })}>+5</Button>
          <Button variant="secondary" onClick={() => set({ ...z, hi: z.hi - 5 })}>−5</Button>
          <Text size="small" tone="secondary">{`Низ ${fmt(z.lo * pip, pip)}`}</Text>
          <Button variant="secondary" onClick={() => set({ ...z, lo: z.lo + 5 })}>+5</Button>
          <Button variant="secondary" onClick={() => set({ ...z, lo: z.lo - 5 })}>−5</Button>
        </Row>
        <Row gap={24} wrap align="center">
          <Stat value={`${st.width} п.`} label="ширина (макс. 60)" tone={st.width <= 60 ? "success" : "danger"} />
          <Stat value={String(st.taps)} label="разворотов (мин. 3)" tone={st.taps >= 3 ? "success" : "danger"} />
          <Stat value={String(st.through)} label="насквозь" />
          <Button onClick={() => setBuilds({ ...builds, [key]: { ...z, ok: st.width <= 60 && st.taps >= 3 } })}>Сдать</Button>
        </Row>
        {result ? (
          <Callout tone={result.ok ? "success" : "danger"} title={result.ok ? "Зачтено" : "Не зачтено"}>
            {`Сдана зона ${fmt(result.lo * pip, pip)}–${fmt(result.hi * pip, pip)}. `}
            {t.good.length ? `Лучшие зоны программы: ${t.good.map((g, i) => `${i + 1}) ${fmt(g[0] * pip, pip)}–${fmt(g[1] * pip, pip)}`).join("; ")}.` : ""}
            {" Программа ищет зоны шириной 50 пипсов с наибольшим числом разворотов. Твоя зона не обязана совпадать точно: главное — правила."}
          </Callout>
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack gap={16}>
      <H2>Тесты: зоны на 28 валютных парах</H2>
      <Text tone="secondary">
        Все основные пары и кроссы OANDA, на каждой неделя и день — 56 заданий в двух режимах. «Выбери зону»: из нескольких вариантов только один проходит правила. «Построй сам»: ищешь зону без подсказок.
      </Text>
      <Row gap={24} wrap>
        <Stat value={`${pickedRight} / ${total}`} label="выбрано верно" />
        <Stat value={`${builtRight} / ${total}`} label="построено самому" />
      </Row>
      <Row gap={8} wrap align="center">
        <Select value={String(pairIdx)} onChange={(v) => setPairIdx(Number(v))}
          options={FX.map((f, i) => {
            const marks = (["W", "D"] as const).map((x) => (picks[`${f.pair}-${x}`] === f[x].ans ? "✓" : "·")).join("");
            return { value: String(i), label: `${f.pair}  ${marks}` };
          })} />
        <Pill active={tf === "W"} onClick={() => setTf("W")}>Неделя</Pill>
        <Pill active={tf === "D"} onClick={() => setTf("D")}>День</Pill>
        <Divider />
        <Pill active={mode === "pick"} onClick={() => setMode("pick")}>Выбери зону</Pill>
        <Pill active={mode === "build"} onClick={() => setMode("build")}>Построй сам</Pill>
        <Button onClick={next}>Следующее задание</Button>
      </Row>
      {body}
      <Row gap={8}>
        <Button variant="secondary" onClick={() => { setPicks({}); setBuilds({}); setDraft({}); }}>Сбросить все результаты</Button>
      </Row>
      <Text size="small" tone="tertiary">
        Неделя собрана из дневных свечей OANDA (около 60 недель). У Алекса на недельном графике история длиннее, поэтому на неделе сильных зон здесь меньше, чем он нашёл бы сам. Пипс: 0,0001, для пар с иеной 0,01.
      </Text>
    </Stack>
  );
}

