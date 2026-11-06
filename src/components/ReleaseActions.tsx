import { Download, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Release, Trainer } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import type { AppActions } from "@/App";

export function ReleaseActions({
  trainer,
  release,
  actions,
}: {
  trainer: Trainer;
  release: Release;
  actions: AppActions;
}) {
  const key = {
    gameId: trainer.gameId,
    trainerId: trainer.id,
    version: release.version,
  };
  const installed = actions.isInstalled(key);
  const progress = actions.progressFor(key);

  if (release.status === "revoked") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-danger">Revoked</span>
        {installed && (
          <Button variant="danger" onClick={() => actions.uninstall(key)}>
            <Trash2 className="size-4" aria-hidden />
            Remove
          </Button>
        )}
      </div>
    );
  }

  if (progress !== null) {
    return (
      <div className="w-44" role="status">
        <div className="mb-1 flex justify-between text-xs text-mute">
          <span>Downloading</span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <div
          role="progressbar"
          aria-label={`Downloading ${trainer.name}`}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 overflow-hidden rounded-full bg-raised"
        >
          <div
            className="h-full bg-acid transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (installed) {
    return (
      <div className="flex items-center gap-1">
        <Button onClick={() => actions.start(trainer, release)}>
          <Play className="size-4" aria-hidden />
          Start
        </Button>
        <Button
          variant="danger"
          aria-label={`Remove ${trainer.name} ${release.version}`}
          onClick={() => actions.uninstall(key)}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
    );
  }

  if (release.status !== "active") {
    return <span className="text-sm text-mute">Replaced</span>;
  }

  return (
    <Button onClick={() => actions.install(key)}>
      <Download className="size-4" aria-hidden />
      Install · {formatBytes(release.download.sizeBytes)}
    </Button>
  );
}
