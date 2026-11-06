import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  buildPreset,
  changedEffects,
  defaultValues,
  effects,
  groups,
  isValidName,
  profiles,
  testedGameVersion,
  type Effect,
  type Values,
} from "@/lib/presets";
import type { AppActions } from "@/App";

type Status = { kind: "idle" | "saved" | "error"; message: string };

function formatValue(value: number) {
  return `${Number(value.toFixed(2))}×`;
}

function EffectRow({
  effect,
  value,
  onChange,
}: {
  effect: Effect;
  value: number;
  onChange: (value: number) => void;
}) {
  const changed = value !== effect.default;
  return (
    <div className="grid grid-cols-[9.5rem_1fr_3.25rem] items-center gap-4">
      <span className={changed ? "text-sm text-text" : "text-sm text-mute"}>
        {effect.label}
      </span>
      <Slider
        aria-label={effect.label}
        min={effect.min}
        max={effect.max}
        step={effect.step}
        value={[value]}
        onValueChange={([next]) => onChange(next)}
      />
      <span
        className={`text-right text-sm tabular-nums ${changed ? "text-acid" : "text-mute"}`}
      >
        {formatValue(value)}
      </span>
    </div>
  );
}

export function VRisingPresets({ actions }: { actions: AppActions }) {
  const [values, setValues] = useState<Values>(defaultValues);
  const [name, setName] = useState("My preset");
  const [folderReady, setFolderReady] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [saving, setSaving] = useState(false);

  // Checked once when the screen opens. `actions` changes on every App render.
  useEffect(() => {
    actions
      .presetsFolder()
      .then(() => setFolderReady(true))
      .catch((error) => setStatus({ kind: "error", message: String(error) }));
  }, []);

  const changed = changedEffects(values);
  const nameValid = isValidName(name);

  function update(next: Values) {
    setValues(next);
    setStatus({ kind: "idle", message: "" });
  }

  async function save() {
    setSaving(true);
    try {
      const path = await actions.savePreset(name, values);
      setStatus({ kind: "saved", message: `Saved to ${path}` });
    } catch (error) {
      setStatus({ kind: "error", message: String(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="presets-title"
      className="rounded-xl border border-line bg-panel p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="presets-title" className="font-display text-xl font-bold">
            World presets
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-mute">
            Creates presets from the game's own world settings. It doesn't edit
            game memory, game files or your saves, and only affects worlds you
            host.
          </p>
        </div>
        <div
          role="group"
          aria-label="Starting profiles"
          className="flex flex-wrap gap-2"
        >
          {profiles.map((profile) => (
            <Button
              key={profile.id}
              variant="secondary"
              className="h-8 px-3"
              onClick={() => update({ ...defaultValues(), ...profile.values })}
            >
              {profile.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`group-${group.id}`}>
              <h3
                id={`group-${group.id}`}
                className="mb-2 font-display text-sm font-bold tracking-widest text-acid uppercase"
              >
                {group.label}
              </h3>
              <div className="space-y-2">
                {effects
                  .filter((effect) => effect.group === group.id)
                  .map((effect) => (
                    <EffectRow
                      key={effect.id}
                      effect={effect}
                      value={values[effect.id]}
                      onChange={(value) =>
                        update({ ...values, [effect.id]: value })
                      }
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-4 self-start rounded-lg bg-raised p-4 lg:sticky lg:top-0">
          <div>
            <label htmlFor="preset-name" className="text-sm font-semibold">
              Preset name
            </label>
            <input
              id="preset-name"
              value={name}
              maxLength={48}
              aria-invalid={!nameValid}
              aria-describedby="name-help"
              onChange={(event) => {
                setName(event.target.value);
                setStatus({ kind: "idle", message: "" });
              }}
              className="mt-1.5 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm focus-visible:ring-4 focus-visible:ring-acid/50 focus-visible:outline-none aria-invalid:border-danger"
            />
            <p id="name-help" className="mt-1 text-xs text-mute">
              Letters, numbers, spaces, hyphens and underscores.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {changed.length} {changed.length === 1 ? "change" : "changes"}
              </h3>
              <Button
                variant="ghost"
                className="h-7 px-2"
                disabled={changed.length === 0}
                onClick={() => update(defaultValues())}
              >
                Reset
              </Button>
            </div>
            {changed.length === 0 ? (
              <p className="text-sm text-mute">
                Move a slider or pick a profile to begin.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {changed.map((effect) => (
                  <li key={effect.id} className="flex justify-between gap-3">
                    <span className="text-mute">{effect.label}</span>
                    <span className="text-acid tabular-nums">
                      {formatValue(values[effect.id])}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-mute hover:text-text">
              Preview file
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-ink p-2 text-xs text-mute">
              {JSON.stringify(buildPreset(values), null, 2)}
            </pre>
          </details>

          <Button
            className="w-full"
            disabled={
              !folderReady || !nameValid || changed.length === 0 || saving
            }
            onClick={save}
          >
            {saving ? "Saving…" : "Save preset"}
          </Button>
          <p role="status" className="text-xs wrap-anywhere text-mute">
            {status.kind === "saved" && (
              <>
                <span className="text-text">{status.message}</span>
                <br />
                Look for it under Load Preset when you set up a private game.
              </>
            )}
            {status.kind === "error" && (
              <span className="text-danger">{status.message}</span>
            )}
          </p>
          <p className="text-xs text-mute">
            Forces PvE. Written for game version {testedGameVersion}. Not
            affiliated with Stunlock Studios.
          </p>
        </div>
      </div>
    </section>
  );
}
