import { Chess, type Square } from "chess.js";

export function legalTargets(fen: string, source: string): string[] {
  return new Chess(fen).moves({ square: source as Square, verbose: true }).map((move) => move.to);
}

export function playVariation(fen: string, from: string, to: string, promotion?: string) {
  const game = new Chess(fen);
  const candidates = game.moves({ verbose: true }).filter((move) => move.from === from && move.to === to);
  if (!candidates.length) return { kind: "invalid" as const };
  if (candidates.some((move) => move.promotion) && !promotion) return { kind: "promotion" as const };
  try {
    const move = game.move({ from, to, promotion });
    return { kind: "move" as const, fen: game.fen(), san: move.san };
  } catch { return { kind: "invalid" as const }; }
}

export function bestMoveSan(fen: string, uci?: string): string | null {
  if (!uci) return null;
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })?.san ?? null;
  } catch { return null; }
}