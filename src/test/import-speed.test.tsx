import { render, fireEvent, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Importer } from "@/components/naf/Importer";
import { fetchLichess } from "@/lib/chess-api";

vi.mock("@/lib/chess-api", () => ({ fetchChessCom: vi.fn(), fetchLichess: vi.fn().mockResolvedValue([]) }));

it("requests all speeds by default for Lichess", async () => {
  const view = render(<Importer onLoad={vi.fn()} />);
  fireEvent.click(view.getByRole("button", { name: "Lichess" }));
  fireEvent.change(view.getByPlaceholderText("Lichess username"), { target: { value: "example" } });
  fireEvent.click(view.getByRole("button", { name: "Fetch games" }));
  await waitFor(() => expect(fetchLichess).toHaveBeenCalledWith("example", "all"));
});