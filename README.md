# Chess Review Studio

SYSTEM PROMPT: Build "NafChessLog" Web Application

You are an expert full-stack engineer specializing in ultra-lightweight, high-performance web applications. Your task is to build a modern, high-speed, and low-resource chess game review platform named NafChessLog.

---

🚀 Core Requirements & Constraints

1. Project Name: NafChessLog
2. Resource Goal (Low-Spec Hosting):
   - The application MUST run smoothly on zero-cost or minimal servers (e.g., Vercel, Netlify, or a 512MB RAM VPS).
   - Heavy engine computations (evaluations, move classification, centipawn loss) MUST NOT be computed on the backend server. All engine calculations MUST run client-side in the user's browser using Stockfish WebAssembly (Wasm) Web Workers.
3. Multi-Source Fetching Capabilities:
   - Chess.com API: Fetch user game archives dynamically (`https://api.chess.com/pub/player/{username}/games/{year}/{month}`).
   - Lichess API: Stream user games directly using the Lichess API (`https://lichess.org/api/user/{username}/games`).
   - Manual Inputs: Support raw PGN string paste, drag-and-drop `.pgn` file parsing, and FEN string state loading.
4. Game Review Engine (Client-Side "Move Classification"):
   - Provide an automated move-by-move evaluation breakdown.
   - Classify moves using evaluation deltas: Best / Excellent / Good / Inaccuracy (?) / Mistake (??) / Blunder (???) / Miss / Brilliant (!!).
   - Display win-rate evaluation bars, move accuracy percentages (0–100%), and key turning points.
5. Support Links & Branding Footer:
   - Incorporate a clean, modern footer featuring developer support links:
     -Owner Domain: https://nafim.vercel.app
     - Donation : https://buymeacoffee.com/mdnafimmuttaki

---

🛠️ Multi-API Integration Architecture

NafChessLog will communicate with the following APIs & client-side engines:

1. Chess.com PubAPI:
   - Endpoints: `GET /pub/player/{username}/games/archives`, `GET /pub/player/{username}/games/{year}/{month}`
   - Requirement: Add a custom `User-Agent` HTTP header (required by Chess.com API guidelines).
2. Lichess REST API:
   - Endpoint: `GET /api/user/{username}/games` (with `Accept: application/x-chess-pgn` or JSON streaming).
   - Includes evaluation data if available in Lichess PGN annotations.
3. Lichess Opening Explorer API / ChessDB API:
   - Endpoint: `https://explorer.lichess.ovh/masters` or `https://explorer.lichess.ovh/lichess`
   - Dynamically identify opening names, ECO codes, and master win/loss percentages for the initial moves of imported games.
4. Lobby / Tablebase API (Lichess Endgame Tablebase):
   - Endpoint: `https://tablebase.lichess.ovh/standard?fen={fen}`
   - Instantly fetch 7-piece endgame theoretical outcomes when position piece count is small, reducing Wasm CPU strain.
5. Client-Side Engine API (Stockfish.js / Stockfish Wasm):
   - Runs in a background Web Worker so the UI thread remains 60fps responsive during deep search analysis.

---

📐 Key Features & Interface Layout

1. Game Importer Header / Hero Section
- Tabs/Selectors:
  - `Chess.com Username` (Fetches recent months, automatically lists match options).
  - `Lichess Username` (Stream recent games with speed filter: Blitz, Rapid, Classical).
  - `Import PGN / FEN` (Text area + Drag-and-drop `.pgn` upload container).
- Match List Preview: Interactive card list showing match opponent, result (Win/Loss/Draw), Elo rating, speed control, and date.

2. Interactive Analysis Dashboard
- Responsive Chessboard: Powered by `react-chessboard` / `chessboard.js` + `chess.js` for legal move validation and rendering.
- Evaluation Bar: Real-time vertical gauge showing engine evaluation (+4.2, -1.5, M3, etc.).
- Move List & Annotations: Scrollable panel rendering PGN moves tagged with color-coded classification badges (Brilliant, Blunder, etc.).
- Game Metrics Card: Overall player accuracy rate, Centipawn Loss (ACPL), and Move Quality breakdown pie chart.
make sure lichess username grabbing and chess.com username grabbing are working fine, no error

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/157ab932-21b3-4ca9-890a-396d1b698118).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
