import { Chess } from "chess.js";
import { expect, it } from "vitest";
import { playVariation, legalTargets, bestMoveSan } from "@/lib/variation";

it("allows legal moves and rejects illegal or wrong-turn moves", () => {
  const fen = new Chess().fen();
  expect(playVariation(fen, "e2", "e5").kind).toBe("invalid");
  expect(playVariation(fen, "e7", "e5").kind).toBe("invalid");
  const moved = playVariation(fen, "e2", "e4");
  expect(moved.kind).toBe("move");
  if (moved.kind !== "move") throw new Error("Expected legal move");
  expect(new Chess(moved.fen).turn()).toBe("b");
  expect(moved.san).toBe("e4");
  expect(new Chess(fen).get("e2")?.type).toBe("p");
});
it("requires an explicit promotion choice and supports underpromotion", () => {
  const fen = "7k/P7/8/8/8/8/8/7K w - - 0 1";
  expect(playVariation(fen, "a7", "a8").kind).toBe("promotion");
  const next = playVariation(fen, "a7", "a8", "n");
  expect(next.kind).toBe("move");
  if (next.kind !== "move") throw new Error("Expected promotion");
  expect(new Chess(next.fen).get("a8")?.type).toBe("n");
});
it("provides legal destinations and best-move notation", () => {
  const fen = new Chess().fen();
  expect(legalTargets(fen, "e2").sort()).toEqual(["e3", "e4"]);
  expect(bestMoveSan(fen, "e2e4")).toBe("e4");
  expect(bestMoveSan(fen, "e2e5")).toBeNull();
});