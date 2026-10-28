import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useState } from "react";
import { Importer } from "@/components/naf/Importer";
import { Analysis } from "@/components/naf/Analysis";
import type { GameSummary } from "@/lib/chess-api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NafChessLog — Free Chess Game Review in Your Browser" },
      { name: "description", content: "Import Chess.com, Lichess or PGN games and get Stockfish move classification, accuracy and turning points — computed locally." },
      { property: "og:title", content: "NafChessLog — Free Chess Game Review" },
      { property: "og:description", content: "Stockfish-powered move classification and accuracy for your Chess.com and Lichess games." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [game, setGame] = useState<{ pgn: string; meta?: GameSummary | undefined } | null>(null);
  return (
    <div className="flex min-h-screen flex-col bg-background bg-hero">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5">
        <button onClick={() => setGame(null)} className="flex items-center gap-2">
          <span className="text-2xl text-primary">♞</span>
          <span className="font-display text-xl font-bold">Naf<span className="text-primary">Chess</span>Log</span>
        </button>
        <span className="text-xs text-muted-foreground">Engine runs in your browser</span>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12">
        {game ? (
          <ClientOnly fallback={<p className="text-muted-foreground">Loading board…</p>}>
            <Analysis key={game.pgn} pgn={game.pgn} meta={game.meta} onBack={() => setGame(null)} />
          </ClientOnly>
        ) : (
          <div className="grid items-start gap-10 pt-6 lg:grid-cols-2 lg:pt-16">
            <div>
              <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
                Review every game.<br /><span className="text-primary">Find every blunder.</span>
              </h1>
              <p className="mt-5 max-w-md text-lg text-muted-foreground">
                Pull games from Chess.com or Lichess, or paste a PGN. Stockfish classifies each move — brilliant to blunder — right on your device.
              </p>
              <div className="mt-8 flex flex-wrap gap-2 text-sm">
                {["Stockfish in a Web Worker", "Accuracy & ACPL", "Opening explorer", "7-piece tablebase"].map((t) => (
                  <span key={t} className="rounded-full border border-border bg-card/60 px-3 py-1 text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>
            <Importer onLoad={(pgn, meta) => setGame({ pgn, meta })} />
          </div>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} NafChessLog</span>
          <div className="flex gap-4">
            <a href="https://nafim.vercel.app" target="_blank" rel="noreferrer" className="hover:text-foreground">nafim.vercel.app</a>
            <a href="https://buymeacoffee.com/mdnafimmuttaki" target="_blank" rel="noreferrer"
              className="rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-foreground">☕ Buy me a coffee</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
