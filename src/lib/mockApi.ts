import seed from "../../src-tauri/resources/catalog-seed.v1.json";
import type { Api, CatalogView, Installed, InstallProgress } from "./api";

const view = {
  catalog: { ...seed, games: [{ id: "v-rising", name: "V Rising" }] },
  lastChecked: Math.floor(Date.now() / 1000),
  stale: false,
} as unknown as CatalogView;

let installed: Installed[] = [];
const consents = new Set<string>();
const handlers = new Set<(progress: InstallProgress) => void>();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockApi: Api = {
  getCatalog: async () => view,
  refreshCatalog: async () => {
    await wait(400);
    return view;
  },
  listInstalled: async () => installed,
  async install(key) {
    for (let percent = 0; percent <= 100; percent += 20) {
      await wait(120);
      handlers.forEach((handler) =>
        handler({ ...key, received: percent, total: 100 }),
      );
    }
    installed = [
      {
        ...key,
        sha256: "mock",
        path: "(browser preview)",
        installedAt: Math.floor(Date.now() / 1000),
      },
      ...installed,
    ];
  },
  async uninstall(key) {
    installed = installed.filter(
      (item) =>
        item.trainerId !== key.trainerId || item.version !== key.version,
    );
  },
  hasConsent: async (key) => consents.has(key.trainerId + key.version),
  async launch(key, accept) {
    if (accept) consents.add(key.trainerId + key.version);
  },
  presetsFolder: async () => "(browser preview)",
  savePreset: async (name) => `(browser preview)\\${name}.json`,
  onProgress(handler) {
    handlers.add(handler);
    return () => handlers.delete(handler);
  },
};
