mod catalog;
mod downloads;
mod execution;
mod presets;
mod storage;

use catalog::Catalog;
use rusqlite::Connection;
use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, RwLock};
use storage::Installed;
use tauri::{AppHandle, Emitter, Manager, State};

struct AppState {
    data_dir: PathBuf,
    db: Mutex<Connection>,
    catalog: RwLock<Catalog>,
}

impl AppState {
    fn db(&self) -> Result<std::sync::MutexGuard<'_, Connection>, String> {
        self.db
            .lock()
            .map_err(|_| "The database is unavailable.".to_string())
    }

    fn catalog(&self) -> Result<Catalog, String> {
        self.catalog
            .read()
            .map(|catalog| catalog.clone())
            .map_err(|_| "The catalog is unavailable.".to_string())
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CatalogView {
    catalog: Catalog,
    last_checked: Option<u64>,
    stale: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallProgress {
    trainer_id: String,
    version: String,
    received: u64,
    total: u64,
}

fn view(state: &AppState) -> Result<CatalogView, String> {
    let last_checked = catalog::last_checked(&state.data_dir);
    Ok(CatalogView {
        catalog: state.catalog()?,
        last_checked,
        stale: catalog::is_stale(last_checked, catalog::now()),
    })
}

/// IDs and versions are validated by catalog::parse, so this stays inside the data folder.
fn trainer_path(data_dir: &Path, game_id: &str, trainer_id: &str, version: &str) -> PathBuf {
    data_dir
        .join("trainers")
        .join(game_id)
        .join(trainer_id)
        .join(version)
        .join("trainer.exe")
}

#[tauri::command(async)]
fn get_catalog(state: State<'_, AppState>) -> Result<CatalogView, String> {
    view(&state)
}

#[tauri::command(async)]
fn refresh_catalog(state: State<'_, AppState>) -> Result<CatalogView, String> {
    let current = state.catalog()?;
    let fresh = catalog::refresh(&state.data_dir, &current)?;
    *state
        .catalog
        .write()
        .map_err(|_| "The catalog is unavailable.".to_string())? = fresh;
    view(&state)
}

#[tauri::command(async)]
fn list_installed(state: State<'_, AppState>) -> Result<Vec<Installed>, String> {
    storage::list_installed(&*state.db()?)
}

#[tauri::command(async)]
fn install_trainer(
    app: AppHandle,
    state: State<'_, AppState>,
    game_id: String,
    trainer_id: String,
    version: String,
) -> Result<(), String> {
    // The download details come from the catalog in Rust, never from the frontend.
    let catalog = state.catalog()?;
    let release = catalog::find_release(&catalog, &trainer_id, &game_id, &version)
        .ok_or("That trainer isn't in the catalog.")?;
    if release.status != "active" {
        return Err("This release isn't available to install.".into());
    }

    let path = trainer_path(&state.data_dir, &game_id, &trainer_id, &version);
    let total = release.download.size_bytes;
    let mut last_percent = u64::MAX;
    downloads::install(&release.download, &path, |received| {
        let percent = received * 100 / total;
        if percent != last_percent {
            last_percent = percent;
            let _ = app.emit(
                "install-progress",
                InstallProgress {
                    trainer_id: trainer_id.clone(),
                    version: version.clone(),
                    received,
                    total,
                },
            );
        }
    })?;

    storage::save_installed(
        &*state.db()?,
        &Installed {
            game_id,
            trainer_id,
            version,
            sha256: release.download.sha256.clone(),
            path: path.display().to_string(),
            installed_at: catalog::now() as i64,
        },
    )
}

#[tauri::command(async)]
fn uninstall_trainer(
    state: State<'_, AppState>,
    game_id: String,
    trainer_id: String,
    version: String,
) -> Result<(), String> {
    let db = state.db()?;
    if storage::get_installed(&db, &game_id, &trainer_id, &version)?.is_none() {
        return Err("That trainer isn't installed.".into());
    }
    // Rebuilt from validated IDs, so a changed database row can't point the delete elsewhere.
    let path = trainer_path(&state.data_dir, &game_id, &trainer_id, &version);
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| {
            format!("Couldn't remove the trainer. Close it if it's still running. ({e})")
        })?;
    }
    storage::remove_installed(&db, &game_id, &trainer_id, &version)
}

#[tauri::command(async)]
fn has_consent(
    state: State<'_, AppState>,
    game_id: String,
    trainer_id: String,
    version: String,
) -> Result<bool, String> {
    let catalog = state.catalog()?;
    let release = catalog::find_release(&catalog, &trainer_id, &game_id, &version)
        .ok_or("That trainer isn't in the catalog.")?;
    storage::has_consent(
        &*state.db()?,
        &release.download.sha256,
        release.requires_elevation,
    )
}

#[tauri::command(async)]
fn launch_trainer(
    state: State<'_, AppState>,
    game_id: String,
    trainer_id: String,
    version: String,
    accept: bool,
) -> Result<(), String> {
    let catalog = state.catalog()?;
    let release = catalog::find_release(&catalog, &trainer_id, &game_id, &version)
        .ok_or("This trainer is no longer listed, so it can't be started.")?;
    if release.status == "revoked" {
        return Err(
            "This release was revoked as unsafe or unlawful, so it can't be started.".into(),
        );
    }

    let db = state.db()?;
    let installed = storage::get_installed(&db, &game_id, &trainer_id, &version)?
        .ok_or("That trainer isn't installed.")?;
    let path = trainer_path(&state.data_dir, &game_id, &trainer_id, &version);
    let hash = downloads::hash_file(&path)?;
    if hash != installed.sha256 || hash != release.download.sha256 {
        return Err("The installed file has changed, so it won't be started. Reinstall it.".into());
    }

    if !storage::has_consent(&db, &hash, release.requires_elevation)? {
        if !accept {
            return Err("Your consent is needed before starting this trainer.".into());
        }
        storage::save_consent(
            &db,
            &hash,
            release.requires_elevation,
            catalog::now() as i64,
        )?;
    }
    drop(db);
    execution::launch(&path)
}

#[tauri::command(async)]
fn presets_folder() -> Result<String, String> {
    presets::folder().map(|path| path.display().to_string())
}

#[tauri::command(async)]
fn save_preset(name: String, values: HashMap<String, f64>) -> Result<String, String> {
    presets::save(&presets::folder()?, &name, &values).map(|path| path.display().to_string())
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_local_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db = storage::open(&data_dir.join("opentrainer.db"))?;
            let catalog = catalog::load_local(&data_dir);
            app.manage(AppState {
                data_dir,
                db: Mutex::new(db),
                catalog: RwLock::new(catalog),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_catalog,
            refresh_catalog,
            list_installed,
            install_trainer,
            uninstall_trainer,
            has_consent,
            launch_trainer,
            presets_folder,
            save_preset
        ])
        .run(tauri::generate_context!())
        .expect("failed to start OpenTrainer");
}
