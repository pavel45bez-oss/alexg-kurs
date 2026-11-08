import datetime as dt
import json
import os
import random

ROOT = os.path.join(os.path.dirname(__file__), "..")
raw = json.load(open(os.path.join(ROOT, "data", "raw", "cdp.json")))
data = json.loads(raw["result"]["value"])

DAILY_N = 200
ZONE_W = 50
STEP = 5


def trading_date(ts):
    return (dt.datetime.utcfromtimestamp(ts) + dt.timedelta(hours=6)).date()


def to_weekly(bars):
    weeks = {}
    order = []
    for ts, o, h, l, c in bars:
        d = trading_date(ts)
        key = d - dt.timedelta(days=d.weekday())
        if key not in weeks:
            weeks[key] = [key, o, h, l, c]
            order.append(key)
        else:
            w = weeks[key]
            w[2] = max(w[2], h)
            w[3] = min(w[3], l)
            w[4] = c
    out = [weeks[k] for k in order]
    return out[1:]


def pivots(closes, lo, hi):
    n = 0
    for i in range(1, len(closes) - 1):
        c = closes[i]
        if lo <= c <= hi:
            p, q = closes[i - 1], closes[i + 1]
            if (c > p and c >= q) or (c < p and c <= q):
                n += 1
    return n


def through(bars, lo, hi):
    return sum(1 for b in bars if (b[1] > hi and b[4] < lo) or (b[1] < lo and b[4] > hi))


def scan(bars):
    closes = [b[4] for b in bars]
    lo0 = int(min(closes)) // STEP * STEP
    hi0 = int(max(closes)) + STEP
    res = []
    for lo in range(lo0, hi0, STEP):
        hi = lo + ZONE_W
        res.append((pivots(closes, lo, hi), -through(bars, lo, hi), lo, hi))
    return res


def build(pair, rawbars):
    jpy = pair.endswith("JPY")
    pip = 0.01 if jpy else 0.0001
    scale = 10 / pip
    tf = {}
    daily = [[trading_date(b[0])] + b[1:] for b in rawbars]
    weekly = to_weekly(rawbars)
    for name, bars in (("W", weekly), ("D", daily[-DAILY_N:])):
        bp = [[b[0]] + [x / pip for x in b[1:]] for b in bars]
        closes = [b[4] for b in bp]
        cands = scan(bp)
        rng = random.Random(pair + name)
        best = sorted(cands, reverse=True)
        good = [z for z in best if z[0] >= 3]
        correct = good[0] if good else None
        opts = []
        if correct:
            opts.append((correct[2], correct[3], "ok"))
        hh = max(b[2] for b in bp)
        ll = min(b[3] for b in bp)
        wick = (int(hh) - 75, int(hh))
        opts.append((wick[0], wick[1], "wide"))
        mid = max(cands, key=lambda z: (-z[1], -z[0]))
        if pivots(closes, mid[2], mid[3]) < 3:
            opts.append((mid[2], mid[3], "through"))
        few = [z for z in cands if 0 < z[0] < 3]
        rng.shuffle(few)
        for z in few[:6]:
            opts.append((z[2], z[3], "few"))
        low = (int(ll), int(ll) + 70)
        opts.insert(3 if correct else 2, (low[0], low[1], "wide"))
        seen = set()
        uniq = []
        for o in opts:
            if (o[0], o[1]) not in seen and not any(o[0] <= u[1] + 5 and o[1] >= u[0] - 5 for u in uniq):
                seen.add((o[0], o[1]))
                uniq.append(o)
        uniq = uniq[:4]
        rng.shuffle(uniq)
        ans = next((i for i, o in enumerate(uniq) if o[2] == "ok"), -1)
        for i, o in enumerate(uniq):
            if o[2] != "ok":
                p = pivots(closes, o[0], o[1])
                assert (o[1] - o[0]) > 60 or p < 3, (pair, name, o, p)
        top = [z for z in best if z[0] >= 3]
        picked = []
        for z in top:
            if all(abs(z[2] - p[0]) >= ZONE_W for p in picked):
                picked.append((z[2], z[3]))
            if len(picked) == 3:
                break
        enc = ";".join(
            b[0].strftime("%d%m") + ":" + ":".join(str(round(x * pip * scale)) for x in b[1:]) for b in bp
        )
        tf[name] = {"bars": enc, "opts": [[o[0], o[1]] for o in uniq], "ans": ans, "good": picked}
    return {"pair": pair, "jpy": jpy, "W": tf["W"], "D": tf["D"]}


out = [build(p, data[p]) for p in data]
json.dump(out, open(os.path.join(ROOT, "data", "fx.json"), "w"))
for q in out:
    print(q["pair"], "W", q["W"]["ans"], q["W"]["opts"], q["W"]["good"], "| D", q["D"]["ans"], len(q["D"]["opts"]))
print(os.path.getsize(os.path.join(ROOT, "data", "fx.json")))
