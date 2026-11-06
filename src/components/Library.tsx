import { Button } from "@/components/ui/button";
import { ReleaseActions } from "@/components/ReleaseActions";
import type { Game, Installed, Trainer } from "@/lib/api";
import { gameArt, initials } from "@/lib/format";
import type { AppActions } from "@/App";

export function Library({
  installed,
  games,
  trainers,
  actions,
  onDiscover,
}: {
  installed: Installed[];
  games: Game[];
  trainers: Trainer[];
  actions: AppActions;
  onDiscover: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Library</h1>
      {installed.length === 0 ? (
        <div className="space-y-4 py-16 text-center">
          <p className="text-mute">You haven't installed any trainers yet.</p>
          <Button onClick={onDiscover}>Browse trainers</Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {installed.map((item) => {
            const game = games.find((g) => g.id === item.gameId);
            const trainer = trainers.find(
              (t) => t.id === item.trainerId && t.gameId === item.gameId,
            );
            const release = trainer?.releases.find(
              (r) => r.version === item.version,
            );
            return (
              <li
                key={`${item.gameId}/${item.trainerId}/${item.version}`}
                className="flex items-center gap-4 rounded-xl border border-line bg-panel p-3"
              >
                <div
                  aria-hidden
                  style={{ background: gameArt(item.gameId) }}
                  className="flex size-16 shrink-0 items-center justify-center rounded-lg font-display text-xl font-bold text-white/90"
                >
                  {initials(game?.name ?? "")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold">
                    {trainer?.name ?? item.trainerId}
                  </p>
                  <p className="truncate text-sm text-mute">
                    {game?.name ?? item.gameId} · Version {item.version}
                  </p>
                  {release?.status === "deprecated" && (
                    <p className="text-sm text-warn">
                      A newer release is available.
                    </p>
                  )}
                </div>
                {trainer && release ? (
                  <ReleaseActions
                    trainer={trainer}
                    release={release}
                    actions={actions}
                  />
                ) : (
                  <Button
                    variant="danger"
                    onClick={() => actions.uninstall(item)}
                  >
                    No longer listed. Remove
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
