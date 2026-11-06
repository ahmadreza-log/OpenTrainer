import { TriangleAlert } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Release, Trainer } from "@/lib/api";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2">
      <dt className="text-mute">{label}</dt>
      <dd className="min-w-0 wrap-anywhere">{value}</dd>
    </div>
  );
}

export function ConsentDialog({
  trainer,
  release,
  stale,
  onConfirm,
  onCancel,
}: {
  trainer: Trainer;
  release: Release;
  stale: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [understood, setUnderstood] = useState(false);
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70" />
        <Dialog.Content className="fixed top-1/2 left-1/2 max-h-[90vh] w-[34rem] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 space-y-4 overflow-y-auto rounded-xl border border-line bg-panel p-6">
          <Dialog.Title className="flex items-center gap-2 font-display text-xl font-bold">
            <TriangleAlert className="size-5 text-warn" aria-hidden />
            Start this trainer?
          </Dialog.Title>
          <Dialog.Description className="text-sm text-mute">
            Trainers are third-party programs that run with your Windows
            permissions, and OpenTrainer doesn't sandbox them. A matching hash
            only shows this is the listed file. Review can't prove it's safe, so
            only continue if you trust the author.
          </Dialog.Description>

          <dl className="space-y-1.5 rounded-lg bg-raised p-3 text-sm">
            <Fact
              label="Trainer"
              value={`${trainer.name} ${release.version}`}
            />
            <Fact label="Author" value={trainer.author.name} />
            <Fact label="License" value={trainer.license.name} />
            <Fact
              label="Permissions"
              value={
                release.requiresElevation
                  ? "Needs administrator rights. Windows will ask you to approve this."
                  : "Runs with your normal permissions."
              }
            />
            <Fact label="SHA-256" value={release.download.sha256} />
          </dl>

          {stale && (
            <p className="rounded-lg border border-warn/40 p-3 text-sm text-warn">
              Your catalog hasn't updated in over 7 days, so OpenTrainer may not
              know about recent safety warnings. Connect to the internet and
              refresh to check.
            </p>
          )}

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={understood}
              onChange={(event) => setUnderstood(event.target.checked)}
              className="mt-0.5 size-4 accent-acid"
            />
            I understand the risks. I'll only use this in single-player or
            offline games.
          </label>

          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            <Button disabled={!understood} onClick={onConfirm}>
              Start trainer
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
