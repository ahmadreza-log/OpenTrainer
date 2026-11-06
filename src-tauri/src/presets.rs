use serde::Deserialize;
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

const EFFECTS: &str = include_str!("../resources/vrising-effects.json");

#[derive(Deserialize)]
struct EffectList {
    effects: Vec<Effect>,
}

#[derive(Deserialize)]
struct Effect {
    id: String,
    path: String,
    min: f64,
    max: f64,
    default: f64,
}

fn effects() -> Vec<Effect> {
    serde_json::from_str::<EffectList>(EFFECTS)
        .expect("effects are embedded and tested")
        .effects
}

/// Builds the preset here, not in the frontend, so only known settings within range are written.
fn build_preset(values: &HashMap<String, f64>) -> Result<Value, String> {
    let effects = effects();
    if let Some(id) = values
        .keys()
        .find(|id| !effects.iter().any(|e| &e.id == *id))
    {
        return Err(format!("Unknown effect: {id}"));
    }

    let mut preset = Map::new();
    preset.insert("GameModeType".into(), json!("PvE"));
    for effect in &effects {
        let value = values.get(&effect.id).copied().unwrap_or(effect.default);
        if !(value >= effect.min && value <= effect.max) {
            return Err(format!("{} is out of range", effect.id));
        }
        if value == effect.default {
            continue;
        }

        let mut target = &mut preset;
        let keys: Vec<&str> = effect.path.split('.').collect();
        let (leaf, parents) = keys.split_last().expect("split always yields a key");
        for key in parents {
            target = target
                .entry(key.to_string())
                .or_insert_with(|| json!({}))
                .as_object_mut()
                .ok_or("Conflicting setting paths")?;
        }
        target.insert(leaf.to_string(), json!(value));
    }
    Ok(Value::Object(preset))
}

/// The name becomes a file name, so this is what keeps writes inside the presets folder.
fn valid_name(name: &str) -> bool {
    let mut chars = name.chars();
    let starts_ok = chars.next().is_some_and(|c| c.is_ascii_alphanumeric());
    let rest_ok = chars.all(|c| c.is_ascii_alphanumeric() || matches!(c, ' ' | '_' | '-'));
    let lower = name.to_ascii_lowercase();
    let reserved = matches!(lower.as_str(), "con" | "prn" | "aux" | "nul")
        || ((lower.starts_with("com") || lower.starts_with("lpt"))
            && lower.len() == 4
            && matches!(lower.as_bytes()[3], b'1'..=b'9'));
    starts_ok && rest_ok && name.len() <= 48 && !name.ends_with(' ') && !reserved
}

pub fn folder() -> Result<PathBuf, String> {
    // shortcut: assumes LocalLow is in its default location, use FOLDERID_LocalAppDataLow if users report otherwise.
    let home = std::env::var_os("USERPROFILE").ok_or("USERPROFILE isn't set")?;
    let path = PathBuf::from(home)
        .join("AppData")
        .join("LocalLow")
        .join("Stunlock Studios")
        .join("VRising")
        .join("ServerSettingsPresets");
    if path.is_dir() {
        Ok(path)
    } else {
        Err("V Rising's presets folder wasn't found. Start the game once, then try again.".into())
    }
}

pub fn save(
    directory: &Path,
    name: &str,
    values: &HashMap<String, f64>,
) -> Result<PathBuf, String> {
    if !valid_name(name) {
        return Err("That preset name isn't allowed.".into());
    }
    let preset = build_preset(values)?;
    let text = serde_json::to_string_pretty(&preset).map_err(|e| e.to_string())?;
    let path = directory.join(format!("{name}.json"));

    // create_new means an existing preset is never overwritten.
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map_err(|e| match e.kind() {
            std::io::ErrorKind::AlreadyExists => {
                "A preset with that name already exists. Choose another name.".to_string()
            }
            _ => e.to_string(),
        })?;
    if let Err(e) = file.write_all(text.as_bytes()) {
        drop(file);
        let _ = fs::remove_file(&path);
        return Err(e.to_string());
    }
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Deserialize)]
    struct Sample {
        values: HashMap<String, f64>,
        expected: Value,
    }

    fn sample() -> Sample {
        serde_json::from_str(include_str!("../resources/vrising-sample-preset.json")).unwrap()
    }

    /// Compares as numbers, because the fixture holds integers and the preset holds floats.
    fn same(left: &Value, right: &Value) -> bool {
        match (left, right) {
            (Value::Object(a), Value::Object(b)) => {
                a.len() == b.len()
                    && a.iter()
                        .all(|(key, value)| b.get(key).is_some_and(|other| same(value, other)))
            }
            (Value::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
            _ => left == right,
        }
    }

    #[test]
    fn matches_the_sample_shared_with_the_frontend() {
        let sample = sample();
        assert!(same(
            &build_preset(&sample.values).unwrap(),
            &sample.expected
        ));
    }

    #[test]
    fn rejects_bad_values() {
        for (id, value) in [
            ("max-health", 99.0),
            ("damage-received", 0.0),
            ("max-health", f64::NAN),
            ("castle-damage", 1.0),
        ] {
            let values = HashMap::from([(id.to_string(), value)]);
            assert!(build_preset(&values).is_err(), "{id}={value}");
        }
    }

    #[test]
    fn forces_pve() {
        assert_eq!(
            build_preset(&HashMap::new()).unwrap(),
            json!({ "GameModeType": "PvE" })
        );
    }

    #[test]
    fn checks_names() {
        for name in ["Relaxed", "My Preset 2", "test_build-1"] {
            assert!(valid_name(name), "{name}");
        }
        let long = "x".repeat(49);
        for name in [
            "",
            " leading",
            "trailing ",
            "../evil",
            "a\\b",
            "a/b",
            "con",
            "LPT1",
            "name.json",
            &long,
        ] {
            assert!(!valid_name(name), "{name}");
        }
    }

    #[test]
    fn writes_a_preset_and_never_overwrites_it() {
        let directory =
            std::env::temp_dir().join(format!("opentrainer-presets-{}", std::process::id()));
        fs::create_dir_all(&directory).unwrap();
        let sample = sample();

        let path = save(&directory, "Test", &sample.values).unwrap();
        let written: Value = serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        assert!(same(&written, &sample.expected));

        let error = save(&directory, "Test", &HashMap::new()).unwrap_err();
        assert!(error.contains("already exists"));
        let unchanged: Value = serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        assert!(same(&unchanged, &sample.expected));

        assert!(save(&directory, "../evil", &HashMap::new()).is_err());
        assert!(!directory.parent().unwrap().join("evil.json").exists());

        fs::remove_file(&path).unwrap();
        fs::remove_dir(&directory).unwrap();
    }
}
