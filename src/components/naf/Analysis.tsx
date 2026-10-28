import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Engine } from "@/lib/engine";
import { fetchOpening, type GameSummary, type OpeningInfo } from "@/lib/chess-api";
import {
  CLASS_META, formatEval, parseGame, reviewGame, winPct,
  type Classification, type PositionEval, type ReviewResult,
} from "@/lib/review";

const ORDER: Classification[] = ["brilliant", "best", "excellent", "good", "book", "inaccuracy", "mistake", "miss", "blunder"];
const CLS_BG: Record<Classification, string> = {
  brilliant: "bg-brilliant", best: "bg-best", excellent: "bg-excellent", good: "bg-good", book: "bg-book",
  inaccuracy: "bg-inaccuracy", mistake: "bg-mistake", miss: "bg-miss", blunder: "bg-blunder",
};

function Badge({ c }: { c: Classification }) {
  return (
    <span title={CLASS_META[c].label} className={`${CLS_BG[c]} inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-background`}>
      {CLASS_META[c].symbol}
    </span>
  );
}

export function Analysis({ pgn, meta, onBack }: { pgn: string; meta?: GameSummary | undefined; onBack: () => void }) {
  const parsed = useMemo(() => {
    try { return { ok: true as const, ...parseGame(pgn) }; }
    catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Invalid PGN/FEN" }; }
  }, [pgn]);

  const [ply, setPly] = useState(0);
  const [depth, setDepth] = useState(12);
  const [evals, setEvals] = useState<PositionEval[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [opening, setOpening] = useState<OpeningInfo | null>(null);
  const [flip, setFlip] = useState(meta?.userColor === "black");
  const engineRef = useRef<Engine | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const moves = parsed.ok ? (result?.moves ?? parsed.moves) : [];

  useEffect(() => {
    if (!parsed.ok) return;
    const signal = { cancelled: false };
    engineRef.current?.terminate();
    const engine = new Engine();
    engineRef.current = engine;
    setResult(null); setEvals([]); setProgress(0);
    reviewGame(engine, parsed.startFen, parsed.moves, depth, (d, t, ev) => { setProgress(d / t); setEvals(ev); }, signal)
      .then((r) => { if (r && !signal.cancelled) setResult(r); });
    return () => { signal.cancelled = true; engine.terminate(); };
  }, [parsed, depth]);

  useEffect(() => {
    if (!parsed.ok) return;
    setPly(parsed.moves.length ? 0 : 0);
    const h = parsed.headers;
    const ecoName = h.Opening || (h.ECOUrl ? decodeURIComponent(h.ECOUrl.split("/").pop() ?? "").replace(/-/g, " ") : "");
    setOpening(ecoName ? { name: ecoName, eco: h.ECO } : null);
    if (parsed.moves.length) fetchOpening(parsed.moves.map((m) => m.uci)).then((o) => o && setOpening((prev) => ({ ...o, name: prev?.name || o.name, eco: prev?.eco || o.eco })));
  }, [parsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setPly((p) => Math.min(moves.length, p + 1));
      if (e.key === "ArrowLeft") setPly((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moves.length]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-ply="${ply}"]`)?.scrollIntoView({ block: "nearest" });
  }, [ply]);

  if (!parsed.ok) {
    return (
      <div className="rounded-2xl border border-destructive/50 bg-card p-6">
        <p className="text-destructive">Could not read that game: {parsed.error}</p>
        <button onClick={onBack} className="mt-4 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground">Back</button>
      </div>
    );
  }

  const fen = ply === 0 ? parsed.startFen : moves[ply - 1].fenAfter;
  const ev = evals[ply];
  const wp = ev ? winPct(ev.cp) : 50;
  const cur = ply > 0 ? moves[ply - 1] : undefined;
  const best = evals[ply]?.best;
  const arrows = best ? [{ startSquare: best.slice(0, 2), endSquare: best.slice(2, 4), color: "rgba(120,200,120,0.75)" }] : [];
  const h = parsed.headers;
  const white = h.White ?? meta?.white ?? "White";
  const black = h.Black ?? meta?.black ?? "Black";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">← New game</button>
        <div className="flex-1 truncate text-sm">
          <b>{white}</b> {h.WhiteElo && `(${h.WhiteElo})`} <span className="text-muted-foreground">vs</span> <b>{black}</b> {h.BlackElo && `(${h.BlackElo})`}
          {h.Result && <span className="ml-2 text-muted-foreground">{h.Result}</span>}
        </div>
        <label className="text-sm text-muted-foreground">Depth
          <select value={depth} onChange={(e) => setDepth(+e.target.value)} className="ml-2 rounded border border-input bg-background px-2 py-1 text-foreground">
            {[10, 12, 14, 16, 18].map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <button onClick={() => setFlip((f) => !f)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">Flip</button>
      </div>

      {progress < 1 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_320px]">
        {/* Eval bar + board */}
        <div className="flex gap-2">
          <div className="relative w-6 overflow-hidden rounded-md bg-eval-black" style={{ height: "min(560px, 86vw)" }}>
            <div className="absolute inset-x-0 bg-eval-white transition-all duration-500"
              style={flip ? { top: 0, height: `${wp}%` } : { bottom: 0, height: `${wp}%` }} />
            <span className={`absolute inset-x-0 text-center text-[10px] font-bold ${wp >= 50 !== flip ? "bottom-1 text-eval-black" : "top-1 text-eval-white"}`}>
              {formatEval(ev).replace("+", "")}
            </span>
          </div>
          <div style={{ width: "min(560px, 86vw)" }}>
            <Chessboard options={{
              position: fen,
              boardOrientation: flip ? "black" : "white",
              allowDragging: false,
              arrows,
              darkSquareStyle: { backgroundColor: "var(--board-dark)" },
              lightSquareStyle: { backgroundColor: "var(--board-light)" },
              boardStyle: { borderRadius: "8px", overflow: "hidden" },
              id: "naf-board",
            }} />
            <div className="mt-2 flex justify-center gap-2">
              {[["⏮", 0], ["◀", Math.max(0, ply - 1)], ["▶", Math.min(moves.length, ply + 1)], ["⏭", moves.length]].map(([l, p]) => (
                <button key={l as string} onClick={() => setPly(p as number)} className="rounded-lg bg-secondary px-4 py-2 hover:bg-muted">{l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Move list */}
        <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-3 text-sm">
            {cur?.cls ? (
              <div className="flex items-center gap-2">
                <Badge c={cur.cls} />
                <b>{cur.san}</b> is {CLASS_META[cur.cls].label.toLowerCase()}
                {cur.bestSan && cur.cls !== "best" && cur.cls !== "brilliant" && <span className="text-muted-foreground">· best was <b className="text-foreground">{cur.bestSan}</b></span>}
              </div>
            ) : (
              <span className="text-muted-foreground">
                Eval {formatEval(ev)}{ev?.tablebase && ` · Tablebase: ${ev.tablebase}`}
              </span>
            )}
          </div>
          <div ref={listRef} className="max-h-[480px] flex-1 overflow-y-auto p-2 font-mono text-sm">
            {moves.length === 0 && <p className="p-3 text-muted-foreground">Position loaded from FEN — engine evaluation shown on the bar.</p>}
            {Array.from({ length: Math.ceil(moves.length / 2) }).map((_, r) => (
              <div key={r} className="grid grid-cols-[2.5rem_1fr_1fr] items-center">
                <span className="text-muted-foreground">{r + 1}.</span>
                {[r * 2, r * 2 + 1].map((i) => moves[i] && (
                  <button key={i} data-ply={i + 1} onClick={() => setPly(i + 1)}
                    className={`flex items-center gap-1.5 rounded px-2 py-1 text-left ${ply === i + 1 ? "bg-primary/20 text-primary" : "hover:bg-muted"} ${result?.turningPoints.includes(i + 1) ? "underline decoration-primary decoration-2" : ""}`}>
                    {moves[i].san}{moves[i].cls && <Badge c={moves[i].cls!} />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-4">
          {opening && (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Opening {opening.eco}</p>
              <p className="font-semibold">{opening.name}</p>
              {opening.white !== undefined && (
                <div className="mt-2 flex h-2 overflow-hidden rounded-full">
                  <div className="bg-eval-white" style={{ width: `${opening.white}%` }} />
                  <div className="bg-muted-foreground" style={{ width: `${opening.draws}%` }} />
                  <div className="bg-eval-black" style={{ width: `${opening.black}%` }} />
                </div>
              )}
            </div>
          )}
          <Metrics result={result} white={white} black={black} onJump={setPly} />
        </div>
      </div>
    </div>
  );
}

function Metrics({ result, white, black, onJump }: { result: ReviewResult | null; white: string; black: string; onJump: (p: number) => void }) {
  if (!result) return <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Stockfish is reviewing the game in your browser…</div>;
  const pie = (side: "w" | "b") => {
    const c = result.counts[side];
    const total = ORDER.reduce((s, k) => s + c[k], 0) || 1;
    let acc = 0;
    const stops = ORDER.filter((k) => c[k]).map((k) => {
      const from = acc; acc += (c[k] / total) * 360;
      return `var(--c-${k}) ${from}deg ${acc}deg`;
    });
    return `conic-gradient(${stops.join(",") || "var(--muted) 0deg 360deg"})`;
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        {(["w", "b"] as const).map((s) => (
          <div key={s}>
            <p className="truncate text-xs text-muted-foreground">{s === "w" ? white : black}</p>
            <p className="font-display text-3xl font-bold text-primary">{result.accuracy[s].toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">accuracy · ACPL {Math.round(result.acpl[s])}</p>
            <div className="mx-auto mt-2 h-20 w-20 rounded-full" style={{ background: pie(s) }}>
              <div className="relative left-1/4 top-1/4 h-10 w-10 rounded-full bg-card" />
            </div>
          </div>
        ))}
      </div>
      <table className="mt-4 w-full text-sm">
        <tbody>
          {ORDER.map((k) => (
            <tr key={k}>
              <td className="py-0.5 text-center">{result.counts.w[k]}</td>
              <td className="py-0.5"><span className="flex items-center justify-center gap-2"><Badge c={k} />{CLASS_META[k].label}</span></td>
              <td className="py-0.5 text-center">{result.counts.b[k]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.turningPoints.length > 0 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Key turning points</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {result.turningPoints.map((p) => (
              <button key={p} onClick={() => onJump(p)} className="rounded bg-secondary px-2 py-1 font-mono text-xs hover:bg-muted">
                {Math.ceil(p / 2)}{p % 2 ? "." : "…"} {result.moves[p - 1].san}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
