use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Installed {
    pub game_id: String,
    pub trainer_id: String,
    pub version: String,
    pub sha256: String,
    pub path: String,
    pub installed_at: i64,
}

pub fn open(path: &Path) -> Result<Connection, String> {
    let connection = Connection::open(path).map_err(|e| e.to_string())?;
    migrate(&connection)?;
    Ok(connection)
}

fn migrate(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS installed (
                game_id TEXT NOT NULL,
                trainer_id TEXT NOT NULL,
                version TEXT NOT NULL,
                sha256 TEXT NOT NULL,
                path TEXT NOT NULL,
                installed_at INTEGER NOT NULL,
                PRIMARY KEY (game_id, trainer_id, version)
            );
            CREATE TABLE IF NOT EXISTS consents (
                sha256 TEXT NOT NULL,
                requires_elevation INTEGER NOT NULL,
                granted_at INTEGER NOT NULL,
                PRIMARY KEY (sha256, requires_elevation)
            );",
        )
        .map_err(|e| e.to_string())
}

pub fn save_installed(connection: &Connection, item: &Installed) -> Result<(), String> {
    connection
        .execute(
            "INSERT OR REPLACE INTO installed VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                item.game_id,
                item.trainer_id,
                item.version,
                item.sha256,
                item.path,
                item.installed_at
            ],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
}

fn read_row(row: &rusqlite::Row) -> rusqlite::Result<Installed> {
    Ok(Installed {
        game_id: row.get(0)?,
        trainer_id: row.get(1)?,
        version: row.get(2)?,
        sha256: row.get(3)?,
        path: row.get(4)?,
        installed_at: row.get(5)?,
    })
}

pub fn list_installed(connection: &Connection) -> Result<Vec<Installed>, String> {
    let mut statement = connection
        .prepare("SELECT * FROM installed ORDER BY installed_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = statement
        .query_map([], read_row)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<_, _>>().map_err(|e| e.to_string())
}

pub fn get_installed(
    connection: &Connection,
    game_id: &str,
    trainer_id: &str,
    version: &str,
) -> Result<Option<Installed>, String> {
    connection
        .query_row(
            "SELECT * FROM installed WHERE game_id = ?1 AND trainer_id = ?2 AND version = ?3",
            params![game_id, trainer_id, version],
            read_row,
        )
        .optional()
        .map_err(|e| e.to_string())
}

pub fn remove_installed(
    connection: &Connection,
    game_id: &str,
    trainer_id: &str,
    version: &str,
) -> Result<(), String> {
    connection
        .execute(
            "DELETE FROM installed WHERE game_id = ?1 AND trainer_id = ?2 AND version = ?3",
            params![game_id, trainer_id, version],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Consent covers one exact file and its elevation need, so a change to either asks again.
pub fn has_consent(
    connection: &Connection,
    sha256: &str,
    requires_elevation: bool,
) -> Result<bool, String> {
    connection
        .query_row(
            "SELECT 1 FROM consents WHERE sha256 = ?1 AND requires_elevation = ?2",
            params![sha256, requires_elevation],
            |_| Ok(()),
        )
        .optional()
        .map(|found| found.is_some())
        .map_err(|e| e.to_string())
}

pub fn save_consent(
    connection: &Connection,
    sha256: &str,
    requires_elevation: bool,
    now: i64,
) -> Result<(), String> {
    connection
        .execute(
            "INSERT OR REPLACE INTO consents VALUES (?1, ?2, ?3)",
            params![sha256, requires_elevation, now],
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn database() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        migrate(&connection).unwrap();
        migrate(&connection).unwrap();
        connection
    }

    #[test]
    fn stores_and_removes_installs() {
        let db = database();
        let item = Installed {
            game_id: "g".into(),
            trainer_id: "t".into(),
            version: "1".into(),
            sha256: "s".into(),
            path: "p".into(),
            installed_at: 1,
        };
        save_installed(&db, &item).unwrap();
        assert_eq!(list_installed(&db).unwrap().len(), 1);
        assert!(get_installed(&db, "g", "t", "1").unwrap().is_some());
        remove_installed(&db, "g", "t", "1").unwrap();
        assert!(get_installed(&db, "g", "t", "1").unwrap().is_none());
    }

    #[test]
    fn consent_is_tied_to_the_file_and_its_risk() {
        let db = database();
        save_consent(&db, "a", false, 1).unwrap();
        assert!(has_consent(&db, "a", false).unwrap());
        assert!(!has_consent(&db, "b", false).unwrap());
        assert!(!has_consent(&db, "a", true).unwrap());
    }
}
