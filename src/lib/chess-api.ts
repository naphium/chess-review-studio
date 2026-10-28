export type Source = "chesscom" | "lichess" | "manual";

export interface GameSummary {
  id: string;
  source: Source;
  white: string;
  black: string;
  whiteElo?: number;
  blackElo?: number;
  result: "win" | "loss" | "draw";
  opponent: string;
  opponentElo?: number;
  userColor: "white" | "black";
  speed: string;
  date: number;
  pgn: string;
  url?: string;
}

const DRAW_RESULTS = new Set([
  "agreed", "repetition", "stalemate", "insufficient", "50move", "timevsinsufficient",
]);

export async function fetchChessCom(username: string, months = 2): Promise<GameSummary[]> {
  const u = username.trim().toLowerCase();
  if (!u) throw new Error("Enter a Chess.com username");
  // Browsers forbid overriding User-Agent; the browser sends its own, which Chess.com accepts.
  const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(u)}/games/archives`);
  if (res.status === 404) throw new Error(`Chess.com user "${username}" not found`);
  if (!res.ok) throw new Error(`Chess.com error (${res.status}). Try again shortly.`);
  const { archives = [] } = (await res.json()) as { archives: string[] };
  if (!archives.length) return [];
  const recent = archives.slice(-months).reverse();
  const out: GameSummary[] = [];
  for (const url of recent) {
    const r = await fetch(url);
    if (!r.ok) continue;
    const data = (await r.json()) as { games: any[] };
    for (const g of (data.games ?? []).slice().reverse()) {
      if (!g.pgn || g.rules !== "chess") continue;
      const isWhite = g.white.username.toLowerCase() === u;
      const me = isWhite ? g.white : g.black;
      const opp = isWhite ? g.black : g.white;
      const result = me.result === "win" ? "win" : DRAW_RESULTS.has(me.result) ? "draw" : "loss";
      out.push({
        id: g.uuid ?? g.url,
        source: "chesscom",
        white: g.white.username,
        black: g.black.username,
        whiteElo: g.white.rating,
        blackElo: g.black.rating,
        result,
        opponent: opp.username,
        opponentElo: opp.rating,
        userColor: isWhite ? "white" : "black",
        speed: g.time_class,
        date: (g.end_time ?? 0) * 1000,
        pgn: g.pgn,
        url: g.url,
      });
    }
    if (out.length >= 40) break;
  }
  return out.slice(0, 40);
}

export async function fetchLichess(username: string, perf: string): Promise<GameSummary[]> {
  const u = username.trim();
  if (!u) throw new Error("Enter a Lichess username");
  const params = new URLSearchParams({
    max: "30", pgnInJson: "true", opening: "true", clocks: "false", evals: "true",
  });
  if (perf !== "all") params.set("perfType", perf);
  const res = await fetch(`https://lichess.org/api/games/user/${encodeURIComponent(u)}?${params}`, {
    headers: { Accept: "application/x-ndjson" },
  });
  if (res.status === 404) throw new Error(`Lichess user "${username}" not found`);
  if (res.status === 429) throw new Error("Lichess rate limit reached. Wait a minute and retry.");
  if (!res.ok) throw new Error(`Lichess error (${res.status})`);
  const text = await res.text();
  const lower = u.toLowerCase();
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l))
    .filter((g) => g.pgn && g.variant === "standard")
    .map((g) => {
      const wName = g.players.white.user?.name ?? "Anonymous";
      const bName = g.players.black.user?.name ?? "Anonymous";
      const isWhite = wName.toLowerCase() === lower;
      const userColor = isWhite ? "white" : "black";
      const result: GameSummary["result"] = !g.winner ? "draw" : g.winner === userColor ? "win" : "loss";
      return {
        id: g.id,
        source: "lichess" as const,
        white: wName,
        black: bName,
        whiteElo: g.players.white.rating,
        blackElo: g.players.black.rating,
        result,
        opponent: isWhite ? bName : wName,
        opponentElo: isWhite ? g.players.black.rating : g.players.white.rating,
        userColor,
        speed: g.speed,
        date: g.createdAt,
        pgn: g.pgn,
        url: `https://lichess.org/${g.id}`,
      };
    });
}

export interface OpeningInfo {
  name?: string;
  eco?: string;
  white?: number;
  draws?: number;
  black?: number;
}

export async function fetchOpening(uciMoves: string[]): Promise<OpeningInfo | null> {
  for (let n = Math.min(uciMoves.length, 14); n > 0; n -= 3) {
    try {
      const r = await fetch(`https://explorer.lichess.ovh/masters?play=${uciMoves.slice(0, n).join(",")}`);
      if (!r.ok) return null;
      const d = await r.json();
      if (d.opening) {
        const t = d.white + d.draws + d.black || 1;
        return {
          name: d.opening.name, eco: d.opening.eco,
          white: Math.round((d.white / t) * 100), draws: Math.round((d.draws / t) * 100),
          black: Math.round((d.black / t) * 100),
        };
      }
    } catch {
      return null;
    }
  }
  return null;
}

export async function fetchTablebase(fen: string): Promise<{ category: string; best?: string; dtm?: number } | null> {
  try {
    const r = await fetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`);
    if (!r.ok) return null;
    const d = await r.json();
    return { category: d.category, best: d.moves?.[0]?.uci, dtm: d.dtm ?? undefined };
  } catch {
    return null;
  }
}
