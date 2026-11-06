import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReleaseActions } from "@/components/ReleaseActions";
import { VRisingPresets } from "@/components/VRisingPresets";
import type { Game, Trainer } from "@/lib/api";
import { gameArt, latestActive } from "@/lib/format";
import type { AppActions } from "@/App";

function TrainerCard({
  trainer,
  actions,
}: {
  trainer: Trainer;
  actions: AppActions;
}) {
  const release = latestActive(trainer.releases) ?? trainer.releases[0];
  return (
    <article className="space-y-4 rounded-xl border border-line bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">{trainer.name}</h2>
          <p className="mt-1 max-w-2xl text-sm text-mute">{trainer.summary}</p>
        </div>
        <ReleaseActions trainer={trainer} release={release} actions={actions} />
      </div>

      {trainer.cheats.length > 0 && (
        <ul aria-label="Cheats" className="flex flex-wrap gap-1.5">
          {trainer.cheats.map((cheat) => (
            <li
              key={cheat}
              className="rounded bg-raised px-2 py-1 text-xs text-text"
            >
              {cheat}
            </li>
          ))}
        </ul>
      )}

      <dl className="grid gap-x-6 gap-y-3 border-t border-line pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-mute">Version</dt>
          <dd>{release.version}</dd>
        </div>
        <div>
          <dt className="text-xs text-mute">Works with</dt>
          <dd>{release.gameVersions.join(", ")}</dd>
        </div>
        <div>
          <dt className="text-xs text-mute">Author</dt>
          <dd>{trainer.author.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-mute">License</dt>
          <dd>{trainer.license.name}</dd>
        </div>
      </dl>

      {release.requiresElevation && (
        <p className="flex items-center gap-2 text-sm text-warn">
          <ShieldAlert className="size-4 shrink-0" aria-hidden />
          Needs administrator rights to run.
        </p>
      )}
      {release.statusReason && (
        <p className="text-sm text-mute">{release.statusReason}</p>
      )}
    </article>
  );
}

export function GameDetail({
  game,
  trainers,
  actions,
  onBack,
}: {
  game: Game;
  trainers: Trainer[];
  actions: AppActions;
  onBack: () => void;
}) {
  return (
    <div>
      <div
        style={{ background: gameArt(game.id) }}
        className="-mx-8 -mt-6 mb-6 px-8 pt-5 pb-8"
      >
        <div className="mx-auto max-w-6xl">
          <Button variant="ghost" className="-ml-3 text-white" onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Button>
          <h1 className="mt-8 font-display text-4xl font-bold text-white">
            {game.name}
          </h1>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-4">
        {game.id === "v-rising" && <VRisingPresets actions={actions} />}
        {trainers.map((trainer) => (
          <TrainerCard key={trainer.id} trainer={trainer} actions={actions} />
        ))}
      </div>
    </div>
  );
}
