export interface EngineEval {
  cp?: number; // from side to move
  mate?: number;
  best?: string;
}

/** Stockfish running in a Web Worker (browser only). Calls are serialized. */
export class Engine {
  private worker: Worker;
  private queue: Promise<unknown> = Promise.resolve();

  constructor() {
    this.worker = new Worker("/engine/stockfish.js");
    this.worker.postMessage("uci");
    this.worker.postMessage("setoption name Hash value 32");
    this.worker.postMessage("isready");
  }

  analyze(fen: string, depth: number): Promise<EngineEval> {
    const run = () =>
      new Promise<EngineEval>((resolve) => {
        const ev: EngineEval = {};
        const onMsg = (e: MessageEvent) => {
          const line = String(e.data);
          if (line.startsWith("info") && line.includes(" score ")) {
            if (/multipv (?!1\b)\d+/.test(line)) return;
            const cp = line.match(/score cp (-?\d+)/);
            const mate = line.match(/score mate (-?\d+)/);
            if (cp) { ev.cp = +cp[1]; ev.mate = undefined; }
            if (mate) { ev.mate = +mate[1]; ev.cp = undefined; }
          } else if (line.startsWith("bestmove")) {
            const b = line.split(" ")[1];
            if (b && b !== "(none)") ev.best = b;
            this.worker.removeEventListener("message", onMsg);
            resolve(ev);
          }
        };
        this.worker.addEventListener("message", onMsg);
        this.worker.postMessage("ucinewgame");
        this.worker.postMessage(`position fen ${fen}`);
        this.worker.postMessage(`go depth ${depth}`);
      });
    const p = this.queue.then(run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  stop() { this.worker.postMessage("stop"); }
  terminate() { this.worker.terminate(); }
}
