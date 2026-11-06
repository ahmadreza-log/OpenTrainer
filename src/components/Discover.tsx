import { Search } from "lucide-react";
import { useState } from "react";
import type { Game, Trainer } from "@/lib/api";
import { gameArt, initials, matchesSearch } from "@/lib/format";

export function Discover({
  games,
  trainers,
  onOpen,
}: {
  games: Game[];
  trainers: Trainer[];
  onOpen: (gameId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const shown = games.filter((game) =>
    matchesSearch(
      query,
      game.name,
      ...trainers
        .filter((trainer) => trainer.gameId === game.id)
        .flatMap((trainer) => [trainer.name, trainer.author.name]),
    ),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">Discover</h1>
        <div className="relative w-80 max-w-full">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Search games and trainers"
            placeholder="Search games and trainers"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 w-full rounded-md border border-line bg-panel pr-3 pl-9 text-sm placeholder:text-mute focus-visible:ring-4 focus-visible:ring-acid/50 focus-visible:outline-none"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-16 text-center text-mute">
          {games.length === 0
            ? "The catalog is empty right now."
            : `Nothing matches "${query}".`}
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4">
          {shown.map((game) => {
            const count = trainers.filter((t) => t.gameId === game.id).length;
            return (
              <li key={game.id}>
                <button
                  type="button"
                  onClick={() => onOpen(game.id)}
                  className="group w-full overflow-hidden rounded-xl border border-line bg-panel text-left transition-colors hover:border-acid focus-visible:ring-4 focus-visible:ring-acid/50 focus-visible:outline-none"
                >
                  <div
                    aria-hidden
                    style={{ background: gameArt(game.id) }}
                    className="flex aspect-[16/10] items-end p-4 font-display text-5xl font-bold text-white/90"
                  >
                    {initials(game.name)}
                  </div>
                  <div className="p-4">
                    <p className="font-display font-bold group-hover:text-acid">
                      {game.name}
                    </p>
                    <p className="mt-0.5 text-sm text-mute">
                      {game.id === "v-rising"
                        ? "World presets"
                        : `${count} ${count === 1 ? "trainer" : "trainers"}`}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
