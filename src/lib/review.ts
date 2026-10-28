import { Chess, type Move } from "chess.js";
import { Engine } from "./engine";
import { fetchTablebase } from "./chess-api";

export type Classification =
  | "brilliant" | "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder" | "miss" | "book";

export const CLASS_META: Record<Classification, { label: string; symbol: string }> = {
  brilliant: { label: "Brilliant", symbol: "!!" },
  best: { label: "Best", symbol: "★" },
  excellent: { label: "Excellent", symbol: "!" },
  good: { label: "Good", symbol: "✓" },
  book: { label: "Book", symbol: "📖" },
  inaccuracy: { label: "Inaccuracy", symbol: "?!" },
  mistake: { label: "Mistake", symbol: "?" },
  miss: { label: "Miss", symbol: "✗" },
  blunder: { label: "Blunder", symbol: "??" },
};

export interface PositionEval {
  /** White-POV centipawns (mate mapped to ±10000-ish) */
  cp: number;
  mate?: number; // white POV
  best?: string;
  tablebase?: string;
}

export interface ReviewedMove {
  san: string;
  uci: string;
  color: "w" | "b";
  fenAfter: string;
  cls?: Classification;
  cpLoss?: number;
  accuracy?: number;
  bestSan?: string;
}

export function winPct(cp: number) {
  const c = Math.max(-1500, Math.min(1500, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}

export function formatEval(e?: PositionEval) {
  if (!e) return "…";
  if (e.mate !== undefined) return `${e.mate > 0 ? "" : "-"}M${Math.abs(e.mate)}`;
  const v = e.cp / 100;
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
}

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function countPieces(fen: string) {
  return fen.split(" ")[0].replace(/[^a-zA-Z]/g, "").length;
}

export function parseGame(pgnOrFen: string): { startFen: string; moves: ReviewedMove[]; headers: Record<string, string> } {
  const txt = pgnOrFen.trim();
  const g = new Chess();
  const isFen = /^([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+\s[wb]/.test(txt);
  if (isFen) {
    g.load(txt);
    return { startFen: g.fen(), moves: [], headers: {} };
  }
  g.loadPgn(txt);
  const headers = g.getHeaders() as Record<string, string>;
  const history = g.history({ verbose: true }) as Move[];
  const startFen = history[0]?.before ?? g.fen();
  return {
    startFen,
    headers,
    moves: history.map((m) => ({
      san: m.san,
      uci: m.from + m.to + (m.promotion ?? ""),
      color: m.color,
      fenAfter: m.after,
    })),
  };
}

async function evalPosition(engine: Engine, fen: string, depth: number): Promise<PositionEval> {
  const ch = new Chess(fen);
  const whiteToMove = fen.split(" ")[1] === "w";
  const sign = whiteToMove ? 1 : -1;
  if (ch.isCheckmate()) return { cp: whiteToMove ? -10000 : 10000, mate: 0 };
  if (ch.isDraw() || ch.isStalemate()) return { cp: 0 };
  if (countPieces(fen) <= 7) {
    const tb = await fetchTablebase(fen);
    if (tb && tb.category !== "unknown") {
      const win = tb.category === "win" ? 1 : tb.category === "loss" ? -1 : 0;
      return {
        cp: win * sign * 2000,
        best: tb.best,
        tablebase: tb.category,
        mate: tb.dtm !== undefined && win ? Math.ceil(Math.abs(tb.dtm) / 2) * win * sign : undefined,
      };
    }
  }
  const r = await engine.analyze(fen, depth);
  if (r.mate !== undefined) {
    const m = r.mate * sign;
    return { cp: (m > 0 ? 1 : -1) * (10000 - Math.abs(m) * 10), mate: m, best: r.best };
  }
  return { cp: (r.cp ?? 0) * sign, best: r.best };
}

function isSacrifice(fenBefore: string, uci: string) {
  const g = new Chess(fenBefore);
  const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || "q" });
  if (!m) return false;
  const moved = VAL[m.piece];
  const captured = m.captured ? VAL[m.captured] : 0;
  if (moved - captured < 2) return false;
  // Can the opponent capture the moved piece?
  return g.moves({ verbose: true }).some((x) => x.to === m.to && x.captured);
}

export function classify(
  before: PositionEval, after: PositionEval, move: ReviewedMove, fenBefore: string,
  prevCls: Classification | undefined, ply: number,
): { cls: Classification; loss: number; cpLoss: number; accuracy: number } {
  const sign = move.color === "w" ? 1 : -1;
  const wpB = winPct(before.cp * sign);
  const wpA = winPct(after.cp * sign);
  const loss = Math.max(0, wpB - wpA);
  const cpLoss = Math.max(0, Math.min(1000, (before.cp - after.cp) * sign));
  const accuracy = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669));
  const isBest = before.best === move.uci;
  let cls: Classification;
  if (isBest || loss < 1) cls = "best";
  else if (loss < 3) cls = "excellent";
  else if (loss < 7) cls = "good";
  else if (loss < 12) cls = "inaccuracy";
  else if (loss < 22) cls = "mistake";
  else cls = "blunder";
  if ((cls === "best" || cls === "excellent") && wpA >= 50 && wpB < 92 && isSacrifice(fenBefore, move.uci)) cls = "brilliant";
  if ((prevCls === "mistake" || prevCls === "blunder") && loss >= 10 && cls !== "blunder") cls = "miss";
  if (ply < 8 && loss < 3 && cls !== "brilliant") cls = ply < 6 ? "book" : cls;
  return { cls, loss, cpLoss, accuracy };
}

export interface ReviewResult {
  evals: PositionEval[];
  moves: ReviewedMove[];
  accuracy: { w: number; b: number };
  acpl: { w: number; b: number };
  counts: { w: Record<Classification, number>; b: Record<Classification, number> };
  turningPoints: number[]; // ply indices (1-based move index)
}

const emptyCounts = () =>
  Object.fromEntries(Object.keys(CLASS_META).map((k) => [k, 0])) as Record<Classification, number>;

export async function reviewGame(
  engine: Engine, startFen: string, moves: ReviewedMove[], depth: number,
  onProgress: (done: number, total: number, evals: PositionEval[]) => void,
  signal: { cancelled: boolean },
): Promise<ReviewResult | null> {
  const fens = [startFen, ...moves.map((m) => m.fenAfter)];
  const evals: PositionEval[] = [];
  for (let i = 0; i < fens.length; i++) {
    if (signal.cancelled) return null;
    evals.push(await evalPosition(engine, fens[i], depth));
    onProgress(i + 1, fens.length, [...evals]);
  }
  const out = moves.map((m) => ({ ...m }));
  const acc = { w: [] as number[], b: [] as number[] };
  const cpl = { w: [] as number[], b: [] as number[] };
  const counts = { w: emptyCounts(), b: emptyCounts() };
  const swings: { i: number; s: number }[] = [];
  for (let i = 0; i < out.length; i++) {
    const r = classify(evals[i], evals[i + 1], out[i], fens[i], out[i - 1]?.cls, i);
    out[i].cls = r.cls;
    out[i].cpLoss = r.cpLoss;
    out[i].accuracy = r.accuracy;
    if (evals[i].best && evals[i].best !== out[i].uci) {
      try {
        const g = new Chess(fens[i]);
        const b = evals[i].best!;
        out[i].bestSan = g.move({ from: b.slice(0, 2), to: b.slice(2, 4), promotion: b[4] || undefined })?.san;
      } catch { /* ignore */ }
    }
    acc[out[i].color].push(r.accuracy);
    cpl[out[i].color].push(r.cpLoss);
    counts[out[i].color][r.cls] = (counts[out[i].color][r.cls] ?? 0) + 1;
    swings.push({ i: i + 1, s: Math.abs(winPct(evals[i + 1]!.cp) - winPct(evals[i]!.cp)) });
  }
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  return {
    evals,
    moves: out,
    accuracy: { w: avg(acc.w), b: avg(acc.b) },
    acpl: { w: avg(cpl.w), b: avg(cpl.b) },
    counts,
    turningPoints: swings.filter((s) => s.s >= 15).sort((a, b) => b.s - a.s).slice(0, 4).map((s) => s.i).sort((a, b) => a - b),
  };
}
