import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { Engine } from "@/lib/engine";
import type { PositionEval } from "@/lib/review";
import { legalTargets, playVariation } from "@/lib/variation";

export function useVariation(baseFen: string, depth: number) {
  const [enabled, setEnabled] = useState(false);
  const [line, setLine] = useState<{ fen: string; san: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);
  const [evaluation, setEvaluation] = useState<{ fen: string; value: PositionEval } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fen = enabled ? line.at(-1)?.fen ?? baseFen : baseFen;
  const game = new Chess(fen);
  const terminal = game.isGameOver();

  useEffect(() => {
    if (!enabled) return;
    setError(null);
    if (terminal) return;
    let engine: Engine | undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      try {
        engine = new Engine();
        engine.analyze(fen, depth).then((value) => {
          if (cancelled) return;
          const sign = new Chess(fen).turn() === "w" ? 1 : -1;
          const mate = value.mate === undefined ? undefined : value.mate * sign;
          setEvaluation({ fen, value: { cp: mate === undefined ? (value.cp ?? 0) * sign : Math.sign(mate) * 10000, mate, best: value.best } });
        }).catch(() => { if (!cancelled) setError("Engine unavailable. Try returning to the game and opening analysis again."); });
      } catch { setError("Engine unavailable."); }
    }, 150);
    return () => { cancelled = true; window.clearTimeout(timer); engine?.terminate(); };
  }, [fen, depth, enabled, terminal]);

  function reset() { setLine([]); setSelected(null); setPromotion(null); }
  function move(from: string, to: string, piece?: string) {
    if (!enabled || promotion && !piece) return false;
    const next = playVariation(fen, from, to, piece);
    if (next.kind === "promotion") { setPromotion({ from, to }); setSelected(null); return false; }
    if (next.kind === "invalid") return false;
    setLine((previous) => [...previous, { fen: next.fen, san: next.san }]);
    setSelected(null); setPromotion(null);
    return true;
  }
  function click(square: string) {
    if (!enabled || promotion) return;
    if (selected && move(selected, square)) return;
    if (selected && playVariation(fen, selected, square).kind === "promotion") return;
    setSelected(legalTargets(fen, square).length ? square : null);
  }
  const ev = terminal ? { cp: game.isCheckmate() ? (game.turn() === "w" ? -10000 : 10000) : 0, mate: game.isCheckmate() ? 0 : undefined } : evaluation?.fen === fen ? evaluation.value : undefined;
  return {
    enabled, fen, line, selected, promotion, ev, error, terminal,
    status: game.isCheckmate() ? "Checkmate" : terminal ? "Draw" : game.turn() === "w" ? "White to move" : "Black to move",
    targets: selected ? legalTargets(fen, selected) : [],
    move, click, reset,
    toggle: () => { reset(); setEnabled((previous) => !previous); },
    leave: () => { reset(); setEnabled(false); },
    undo: () => { setLine((previous) => previous.slice(0, -1)); setSelected(null); setPromotion(null); },
    cancelPromotion: () => setPromotion(null),
  };
}