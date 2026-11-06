import { Compass, Library as LibraryIcon, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConsentDialog } from "@/components/ConsentDialog";
import { Discover } from "@/components/Discover";
import { GameDetail } from "@/components/GameDetail";
import { Library } from "@/components/Library";
import { Button } from "@/components/ui/button";
import {
  getApi,
  type Api,
  type CatalogView,
  type Installed,
  type Release,
  type ReleaseKey,
  type Trainer,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export interface AppActions {
  isInstalled: (key: ReleaseKey) => boolean;
  progressFor: (key: ReleaseKey) => number | null;
  install: (key: ReleaseKey) => void;
  uninstall: (key: ReleaseKey) => void;
  start: (trainer: Trainer, release: Release) => void;
}

type Page = { name: "discover" | "library" } | { name: "game"; id: string };

const progressKey = (trainerId: string, version: string) =>
  `${trainerId}@${version}`;

export function App() {
  const api = useRef<Api | null>(null);
  const [view, setView] = useState<CatalogView | null>(null);
  const [installed, setInstalled] = useState<Installed[]>([]);
  const [page, setPage] = useState<Page>({ name: "discover" });
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [online, setOnline] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState<{
    trainer: Trainer;
    release: Release;
  } | null>(null);

  const report = (cause: unknown) => setError(String(cause));

  const refresh = useCallback(async () => {
    if (!api.current) return;
    setRefreshing(true);
    try {
      setView(await api.current.refreshCatalog());
      setOnline(true);
    } catch {
      // Offline is a normal state, so the local catalog stays in use without an error.
      setOnline(false);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let stopProgress = () => {};
    let cancelled = false;
    (async () => {
      const client = await getApi();
      if (cancelled) return;
      api.current = client;
      stopProgress = client.onProgress(
        ({ trainerId, version, received, total }) =>
          setProgress((current) => ({
            ...current,
            [progressKey(trainerId, version)]: Math.floor(
              (received * 100) / total,
            ),
          })),
      );
      setView(await client.getCatalog());
      setInstalled(await client.listInstalled());
      await refresh();
    })().catch(report);
    return () => {
      cancelled = true;
      stopProgress();
    };
  }, [refresh]);

  const actions: AppActions = {
    isInstalled: (key) =>
      installed.some(
        (item) =>
          item.gameId === key.gameId &&
          item.trainerId === key.trainerId &&
          item.version === key.version,
      ),
    progressFor: (key) =>
      progress[progressKey(key.trainerId, key.version)] ?? null,
    async install(key) {
      const id = progressKey(key.trainerId, key.version);
      setError(null);
      setProgress((current) => ({ ...current, [id]: 0 }));
      try {
        await api.current!.install(key);
        setInstalled(await api.current!.listInstalled());
      } catch (cause) {
        report(cause);
      } finally {
        setProgress((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      }
    },
    async uninstall(key) {
      setError(null);
      try {
        await api.current!.uninstall(key);
        setInstalled(await api.current!.listInstalled());
      } catch (cause) {
        report(cause);
      }
    },
    async start(trainer, release) {
      setError(null);
      const key = {
        gameId: trainer.gameId,
        trainerId: trainer.id,
        version: release.version,
      };
      try {
        if (await api.current!.hasConsent(key)) {
          await api.current!.launch(key, false);
        } else {
          setConsent({ trainer, release });
        }
      } catch (cause) {
        report(cause);
      }
    },
  };

  async function confirmConsent() {
    if (!consent) return;
    const { trainer, release } = consent;
    setConsent(null);
    try {
      await api.current!.launch(
        {
          gameId: trainer.gameId,
          trainerId: trainer.id,
          version: release.version,
        },
        true,
      );
    } catch (cause) {
      report(cause);
    }
  }

  const games = view?.catalog.games ?? [];
  const trainers = view?.catalog.trainers ?? [];
  const openGame =
    page.name === "game" ? games.find((g) => g.id === page.id) : null;

  const nav = [
    { name: "discover", label: "Discover", icon: Compass },
    { name: "library", label: "Library", icon: LibraryIcon },
  ] as const;

  return (
    <div className="grid h-full grid-cols-[14rem_1fr]">
      <nav
        aria-label="Main"
        className="flex flex-col gap-1 border-r border-line bg-panel p-4"
      >
        <p className="mb-5 px-2 font-display text-xl font-bold tracking-wide">
          Open<span className="text-acid">Trainer</span>
        </p>
        {nav.map((item) => {
          const active =
            page.name === item.name ||
            (item.name === "discover" && page.name === "game");
          return (
            <button
              key={item.name}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => setPage({ name: item.name })}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:ring-4 focus-visible:ring-acid/50 focus-visible:outline-none",
                active
                  ? "bg-acid text-ink"
                  : "text-mute hover:bg-raised hover:text-text",
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
              {item.name === "library" && installed.length > 0 && (
                <span className="ml-auto text-xs tabular-nums">
                  {installed.length}
                </span>
              )}
            </button>
          );
        })}

        <div className="mt-auto space-y-2 px-2 text-xs text-mute">
          <p className="flex items-center gap-2" role="status">
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                online === null && "bg-mute",
                online === true && "bg-acid",
                online === false && "bg-warn",
              )}
            />
            {online === null && "Checking for updates"}
            {online === true && "Catalog up to date"}
            {online === false && "Offline, using saved catalog"}
          </p>
          <Button
            variant="ghost"
            className="-ml-3 h-8"
            disabled={refreshing}
            onClick={refresh}
          >
            <RefreshCw
              className={cn("size-3.5", refreshing && "animate-spin")}
              aria-hidden
            />
            Refresh
          </Button>
        </div>
      </nav>

      <main className="min-h-0 overflow-y-auto px-8 py-6">
        {error && (
          <div
            role="alert"
            className="mx-auto mb-4 flex max-w-6xl items-start justify-between gap-4 rounded-lg border border-danger/50 p-3 text-sm text-danger"
          >
            {error}
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError(null)}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}

        {page.name === "discover" && (
          <Discover
            games={games}
            trainers={trainers}
            onOpen={(id) => setPage({ name: "game", id })}
          />
        )}
        {page.name === "library" && (
          <Library
            installed={installed}
            games={games}
            trainers={trainers}
            actions={actions}
            onDiscover={() => setPage({ name: "discover" })}
          />
        )}
        {openGame && (
          <GameDetail
            game={openGame}
            trainers={trainers.filter((t) => t.gameId === openGame.id)}
            actions={actions}
            onBack={() => setPage({ name: "discover" })}
          />
        )}
      </main>

      {consent && (
        <ConsentDialog
          trainer={consent.trainer}
          release={consent.release}
          stale={view?.stale ?? false}
          onConfirm={confirmConsent}
          onCancel={() => setConsent(null)}
        />
      )}
    </div>
  );
}
