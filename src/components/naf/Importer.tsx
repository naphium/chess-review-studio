import { useState, type DragEvent } from "react";
import { fetchChessCom, fetchLichess, type GameSummary } from "@/lib/chess-api";

type Tab = "chesscom" | "lichess" | "manual";

export function Importer({ onLoad }: { onLoad: (pgn: string, meta?: GameSummary) => void }) {
  const [tab, setTab] = useState<Tab>("chesscom");
  const [user, setUser] = useState("");
  const [perf, setPerf] = useState("blitz");
  const [text, setText] = useState("");
  const [games, setGames] = useState<GameSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setGames(null);
    try {
      const list = tab === "chesscom" ? await fetchChessCom(user) : await fetchLichess(user, perf);
      setGames(list);
      if (!list.length) setError("No games found for that player/filter.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch games");
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) f.text().then(setText);
  }

  const tabs: [Tab, string][] = [["chesscom", "Chess.com"], ["lichess", "Lichess"], ["manual", "PGN / FEN"]];

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-glow backdrop-blur">
      <div className="mb-4 flex gap-1 rounded-xl bg-muted p-1">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => { setTab(k); setGames(null); setError(null); }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab !== "manual" ? (
        <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder={`${tab === "chesscom" ? "Chess.com" : "Lichess"} username`}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring" />
          {tab === "lichess" && (
            <select value={perf} onChange={(e) => setPerf(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2.5">
              <option value="all">All speeds</option><option value="bullet">Bullet</option><option value="blitz">Blitz</option>
              <option value="rapid">Rapid</option><option value="classical">Classical</option>
            </select>
          )}
          <button disabled={loading || !user.trim()} className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground disabled:opacity-50">
            {loading ? "Fetching…" : "Fetch games"}
          </button>
        </form>
      ) : (
        <div className="space-y-2">
          <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
            className={`rounded-lg border-2 border-dashed p-1 transition ${drag ? "border-primary" : "border-border"}`}>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6}
              placeholder="Paste PGN or FEN here — or drop a .pgn file"
              className="w-full resize-none bg-transparent p-2 font-mono text-xs outline-none" />
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
              Upload .pgn
              <input type="file" accept=".pgn,text/plain" hidden onChange={(e) => e.target.files?.[0]?.text().then(setText)} />
            </label>
            <button disabled={!text.trim()} onClick={() => onLoad(text)}
              className="flex-1 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">Analyze</button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {games && games.length > 0 && (
        <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
          {games.map((g) => (
            <li key={g.id}>
              <button onClick={() => onLoad(g.pgn, g)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-2 text-left transition hover:border-primary">
                <span className={`w-12 rounded px-1.5 py-0.5 text-center text-xs font-bold uppercase ${g.result === "win" ? "bg-best text-background" : g.result === "loss" ? "bg-blunder text-background" : "bg-muted text-muted-foreground"}`}>
                  {g.result}
                </span>
                <span className={`h-3 w-3 rounded-full border border-border ${g.userColor === "white" ? "bg-eval-white" : "bg-eval-black"}`} />
                <span className="flex-1 truncate font-medium">vs {g.opponent} <span className="text-muted-foreground">({g.opponentElo ?? "?"})</span></span>
                <span className="text-xs capitalize text-muted-foreground">{g.speed}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{new Date(g.date).toLocaleDateString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
