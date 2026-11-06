use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

const CATALOG_URL: &str =
    "https://github.com/ahmadreza-log/OpenTrainer-Trainers/releases/download/catalog/catalog.v1.json";
const SEED: &str = include_str!("../resources/catalog-seed.v1.json");
const MAX_CATALOG_BYTES: u64 = 16 * 1024 * 1024;
const MAX_TRAINER_BYTES: u64 = 524_288_000;
const STALE_AFTER_SECONDS: u64 = 7 * 24 * 60 * 60;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Catalog {
    pub schema_version: u32,
    pub generated_at: String,
    pub games: Vec<Game>,
    pub trainers: Vec<Trainer>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Game {
    pub id: String,
    pub name: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Trainer {
    pub id: String,
    pub game_id: String,
    pub name: String,
    pub summary: String,
    #[serde(default)]
    pub cheats: Vec<String>,
    pub author: Author,
    pub license: License,
    pub source_code: Option<String>,
    pub releases: Vec<Release>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Author {
    pub name: String,
    pub github: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct License {
    pub name: String,
    pub url: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Release {
    pub version: String,
    pub status: String,
    pub status_reason: Option<String>,
    pub published_at: String,
    pub format: String,
    pub requires_elevation: bool,
    pub game_versions: Vec<String>,
    pub download: Download,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Download {
    pub url: String,
    pub file_name: String,
    pub sha256: String,
    pub size_bytes: u64,
}

fn valid_slug(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 80
        && !value.starts_with('-')
        && !value.ends_with('-')
        && !value.contains("--")
        && value
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

fn valid_version(value: &str) -> bool {
    value.len() <= 50
        && value
            .chars()
            .next()
            .is_some_and(|c| c.is_ascii_alphanumeric())
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '+' | '-'))
}

/// Same rule as the catalog schema: a direct GitHub Release asset, with nothing that can resolve elsewhere.
fn valid_download_url(url: &str) -> bool {
    let Some(path) = url.strip_prefix("https://github.com/") else {
        return false;
    };
    let parts: Vec<&str> = path.split('/').collect();
    let [owner, repo, "releases", "download", tag, file] = parts[..] else {
        return false;
    };
    let plain = |s: &str| !s.is_empty() && s != "." && s != ".." && !s.contains(['?', '#', '\\']);
    plain(owner) && plain(repo) && plain(tag) && plain(file)
}

fn valid_sha256(value: &str) -> bool {
    value.len() == 64 && value.chars().all(|c| matches!(c, '0'..='9' | 'a'..='f'))
}

/// The catalog comes from the network, so every field used for paths or downloads is checked here.
pub fn parse(text: &str) -> Result<Catalog, String> {
    let catalog: Catalog = serde_json::from_str(text).map_err(|e| e.to_string())?;
    if catalog.schema_version != 1 {
        return Err("Unsupported catalog version. Please update OpenTrainer.".into());
    }
    for game in &catalog.games {
        if !valid_slug(&game.id) {
            return Err(format!("Invalid game ID: {}", game.id));
        }
    }
    for trainer in &catalog.trainers {
        if !valid_slug(&trainer.id) || !valid_slug(&trainer.game_id) {
            return Err(format!("Invalid trainer ID: {}", trainer.id));
        }
        for release in &trainer.releases {
            let ok = valid_version(&release.version)
                && matches!(release.status.as_str(), "active" | "deprecated" | "revoked")
                && release.format == "exe"
                && valid_download_url(&release.download.url)
                && valid_sha256(&release.download.sha256)
                && (1..=MAX_TRAINER_BYTES).contains(&release.download.size_bytes);
            if !ok {
                return Err(format!(
                    "Invalid release {} of {}",
                    release.version, trainer.id
                ));
            }
        }
    }
    Ok(catalog)
}

pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_secs())
}

pub fn is_stale(last_checked: Option<u64>, now: u64) -> bool {
    last_checked.is_none_or(|checked| now.saturating_sub(checked) > STALE_AFTER_SECONDS)
}

/// Uses the newest valid copy, so an old cached or downloaded catalog can't undo a revocation.
pub fn load_local(data_dir: &Path) -> Catalog {
    let seed = parse(SEED).expect("the bundled catalog is checked by tests");
    match fs::read_to_string(data_dir.join("catalog.v1.json"))
        .ok()
        .and_then(|text| parse(&text).ok())
    {
        Some(cached) if cached.generated_at >= seed.generated_at => cached,
        _ => seed,
    }
}

pub fn last_checked(data_dir: &Path) -> Option<u64> {
    fs::read_to_string(data_dir.join("catalog-checked.txt"))
        .ok()?
        .trim()
        .parse()
        .ok()
}

/// Returns the catalog to use. Failing here leaves the local copy in place.
pub fn refresh(data_dir: &Path, current: &Catalog) -> Result<Catalog, String> {
    let response = ureq::get(CATALOG_URL).call().map_err(|e| e.to_string())?;
    let mut text = String::new();
    response
        .into_reader()
        .take(MAX_CATALOG_BYTES + 1)
        .read_to_string(&mut text)
        .map_err(|e| e.to_string())?;
    if text.len() as u64 > MAX_CATALOG_BYTES {
        return Err("The catalog is too large.".into());
    }
    let fresh = parse(&text)?;

    fs::write(data_dir.join("catalog-checked.txt"), now().to_string())
        .map_err(|e| e.to_string())?;
    if fresh.generated_at < current.generated_at {
        return Ok(current.clone());
    }
    let temp = data_dir.join("catalog.v1.json.tmp");
    fs::write(&temp, &text).map_err(|e| e.to_string())?;
    fs::rename(&temp, data_dir.join("catalog.v1.json")).map_err(|e| e.to_string())?;
    Ok(fresh)
}

pub fn find_release<'a>(
    catalog: &'a Catalog,
    trainer_id: &str,
    game_id: &str,
    version: &str,
) -> Option<&'a Release> {
    catalog
        .trainers
        .iter()
        .find(|t| t.id == trainer_id && t.game_id == game_id)?
        .releases
        .iter()
        .find(|r| r.version == version)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn seed_with(change: impl Fn(&mut serde_json::Value)) -> Result<Catalog, String> {
        let mut value: serde_json::Value = serde_json::from_str(SEED).unwrap();
        change(&mut value);
        parse(&value.to_string())
    }

    #[test]
    fn bundled_catalog_is_valid() {
        let catalog = parse(SEED).unwrap();
        assert!(!catalog.trainers.is_empty());
    }

    #[test]
    fn ignores_unknown_fields() {
        assert!(seed_with(|v| v["newField"] = 1.into()).is_ok());
    }

    #[test]
    fn rejects_unsafe_entries() {
        let release = "/trainers/0/releases/0";
        let cases: Vec<(String, serde_json::Value)> = vec![
            (format!("{release}/download/sha256"), "ABC".into()),
            (format!("{release}/download/sizeBytes"), 0.into()),
            (format!("{release}/format"), "dll".into()),
            (format!("{release}/status"), "mystery".into()),
            (format!("{release}/version"), "../../evil".into()),
            ("/trainers/0/id".into(), "..".into()),
            ("/trainers/0/gameId".into(), "a/b".into()),
            ("/games/0/id".into(), "C:".into()),
            ("/schemaVersion".into(), 2.into()),
        ];
        for (pointer, bad) in cases {
            let result = seed_with(|v| *v.pointer_mut(&pointer).unwrap() = bad.clone());
            assert!(result.is_err(), "{pointer} = {bad}");
        }
    }

    #[test]
    fn checks_download_urls() {
        for url in [
            "http://github.com/a/b/releases/download/v1/a.exe",
            "https://evil.example/a/b/releases/download/v1/a.exe",
            "https://github.com.evil.example/a/b/releases/download/v1/a.exe",
            "https://github.com/a/b/raw/main/a.exe",
            "https://github.com/a/b/releases/download/../a.exe",
            "https://github.com/a/b/releases/download/v1/..",
            "https://github.com/a/b/releases/download/v1/a.exe?x=1",
        ] {
            assert!(!valid_download_url(url), "{url}");
        }
        assert!(valid_download_url(
            "https://github.com/a/b/releases/download/v1/a.exe"
        ));
    }

    #[test]
    fn stale_after_seven_days_or_never_checked() {
        let day = 24 * 60 * 60;
        assert!(is_stale(None, 100));
        assert!(!is_stale(Some(day), day * 7));
        assert!(is_stale(Some(day), day * 9));
    }
}
