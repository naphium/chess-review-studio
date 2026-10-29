import { describe, expect, it } from "vitest";
import { estimateGameElo } from "@/lib/review-rating";

describe("single-game estimated Elo", () => {
  it("does not estimate from fewer than ten moves", () => {
    expect(estimateGameElo(90, 9)).toBeNull();
    expect(estimateGameElo(90, 10)).toBe(2750);
  });
  it("maps accuracy to a rounded, bounded heuristic", () => {
    expect(estimateGameElo(0, 20)).toBe(400);
    expect(estimateGameElo(50, 20)).toBe(1700);
    expect(estimateGameElo(100, 20)).toBe(3000);
    expect(estimateGameElo(110, 20)).toBe(3000);
  });
  it("withholds invalid accuracy", () => {
    expect(estimateGameElo(Number.NaN, 20)).toBeNull();
  });
});