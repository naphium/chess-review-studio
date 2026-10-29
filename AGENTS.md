<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- All chess engine work (Stockfish, classification) runs client-side in a Web Worker from public/engine; game/opening/tablebase APIs are fetched directly from the browser — keeps hosting near-zero cost.
- Single-game estimated Elo uses both actual player ratings and relative engine accuracy in review-rating; withhold it when either rating or ten moves each are missing and explicitly distinguish this custom estimate from Chess.com's unpublished formula.
- Interactive variations use chess.js legal validation and a separate short-lived client Worker per settled position, discarding stale results and leaving the imported review and its metrics unchanged.
