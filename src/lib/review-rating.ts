/** A rough single-game accuracy heuristic, not a calibrated or official Elo rating. */
export function estimateGameElo(accuracy: number, moveCount: number): number | null {
  if (!Number.isFinite(accuracy) || moveCount < 10) return null;
  const boundedAccuracy = Math.max(0, Math.min(100, accuracy));
  return Math.round((400 + 26 * boundedAccuracy) / 50) * 50;
}