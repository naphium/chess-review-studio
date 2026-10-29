export interface MatchRatingInput {
  accuracy: number;
  opponentAccuracy: number;
  playerRating: number;
  opponentRating: number;
  moveCount: number;
  opponentMoveCount: number;
}

/** Custom match-relative estimate, not a calibrated rating or Chess.com's private formula. */
export function estimateGameElo(input: MatchRatingInput): number | null {
  const { accuracy, opponentAccuracy, playerRating, opponentRating, moveCount, opponentMoveCount } = input;
  if (![accuracy, opponentAccuracy, playerRating, opponentRating].every(Number.isFinite)
    || playerRating <= 0 || opponentRating <= 0 || moveCount < 10 || opponentMoveCount < 10) return null;
  const quality = (value: number) => Math.max(1, Math.min(99, value));
  const adjustment = Math.max(-400, Math.min(400, 400 * Math.log10(quality(accuracy) / quality(opponentAccuracy))));
  return Math.round(Math.max(100, (playerRating + opponentRating) / 2 + adjustment) / 25) * 25;
}