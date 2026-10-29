import { describe, expect, it } from "vitest";
import { estimateGameElo } from "@/lib/review-rating";

describe("single-game estimated Elo", () => {
  const match = { accuracy: 80, opponentAccuracy: 80, playerRating: 1500, opponentRating: 1700, moveCount: 20, opponentMoveCount: 20 };
  it("does not estimate from fewer than ten moves", () => {
    expect(estimateGameElo({ ...match, moveCount: 9 })).toBeNull();
    expect(estimateGameElo({ ...match, opponentMoveCount: 9 })).toBeNull();
    expect(estimateGameElo({ ...match, moveCount: 10 })).toBe(1600);
  });
  it("anchors equal-quality play to actual match ratings", () => {
    expect(estimateGameElo(match)).toBe(1600);
    expect(estimateGameElo({ ...match, playerRating: 2500, opponentRating: 2700 })).toBe(2600);
  });
  it("adjusts for relative move quality, not accuracy alone", () => {
    expect(estimateGameElo({ ...match, opponentAccuracy: 40 })).toBe(1725);
    expect(estimateGameElo({ ...match, accuracy: 40 })).toBe(1475);
  });
  it("withholds missing actual ratings and invalid accuracy", () => {
    expect(estimateGameElo({ ...match, accuracy: Number.NaN })).toBeNull();
    expect(estimateGameElo({ ...match, playerRating: 0 })).toBeNull();
    expect(estimateGameElo({ ...match, opponentRating: Number.NaN })).toBeNull();
  });
});