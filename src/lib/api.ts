import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface Game {
  id: string;
  name: string;
}

export interface Release {
  version: string;
  status: "active" | "deprecated" | "revoked";
  statusReason?: string | null;
  publishedAt: string;
  format: string;
  requiresElevation: boolean;
  gameVersions: string[];
  download: {
    url: string;
    fileName: string;
    sha256: string;
    sizeBytes: number;
  };
}

export interface Trainer {
  id: string;
  gameId: string;
  name: string;
  summary: string;
  cheats: string[];
  author: { name: string; github?: string | null };
  license: { name: string; url: string };
  sourceCode?: string | null;
  releases: Release[];
}

export interface CatalogView {
  catalog: { generatedAt: string; games: Game[]; trainers: Trainer[] };
  lastChecked: number | null;
  stale: boolean;
}

export interface Installed {
  gameId: string;
  trainerId: string;
  version: string;
  sha256: string;
  path: string;
  installedAt: number;
}

export interface InstallProgress {
  trainerId: string;
  version: string;
  received: number;
  total: number;
}

export type ReleaseKey = { gameId: string; trainerId: string; version: string };

export interface Api {
  getCatalog(): Promise<CatalogView>;
  refreshCatalog(): Promise<CatalogView>;
  listInstalled(): Promise<Installed[]>;
  install(key: ReleaseKey): Promise<void>;
  uninstall(key: ReleaseKey): Promise<void>;
  hasConsent(key: ReleaseKey): Promise<boolean>;
  launch(key: ReleaseKey, accept: boolean): Promise<void>;
  onProgress(handler: (progress: InstallProgress) => void): () => void;
}

const desktopApi: Api = {
  getCatalog: () => invoke("get_catalog"),
  refreshCatalog: () => invoke("refresh_catalog"),
  listInstalled: () => invoke("list_installed"),
  install: (key) => invoke("install_trainer", key),
  uninstall: (key) => invoke("uninstall_trainer", key),
  hasConsent: (key) => invoke("has_consent", key),
  launch: (key, accept) => invoke("launch_trainer", { ...key, accept }),
  onProgress(handler) {
    const stop = listen<InstallProgress>("install-progress", (event) =>
      handler(event.payload),
    );
    return () => void stop.then((unlisten) => unlisten());
  },
};

export const isDesktop = isTauri();

export async function getApi(): Promise<Api> {
  if (isDesktop) return desktopApi;
  // Browser design previews only. Vite leaves this out of the shipped app.
  if (import.meta.env.DEV) return (await import("./mockApi")).mockApi;
  throw new Error("OpenTrainer must run as the desktop app.");
}
