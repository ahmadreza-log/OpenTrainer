use crate::catalog::Download;
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;

fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// Copies the data while checking size and hash, stopping as soon as it's larger than listed.
fn copy_verified(
    mut reader: impl Read,
    mut writer: impl Write,
    download: &Download,
    mut on_progress: impl FnMut(u64),
) -> Result<(), String> {
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 64 * 1024];
    let mut received = 0u64;
    loop {
        let count = reader.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        received += count as u64;
        if received > download.size_bytes {
            return Err("The download is larger than listed, so it was discarded.".into());
        }
        hasher.update(&buffer[..count]);
        writer
            .write_all(&buffer[..count])
            .map_err(|e| e.to_string())?;
        on_progress(received);
    }
    if received != download.size_bytes {
        return Err("The download is incomplete, so it was discarded.".into());
    }
    if to_hex(&hasher.finalize()) != download.sha256 {
        return Err("The file doesn't match the catalog's hash, so it was discarded.".into());
    }
    Ok(())
}

pub fn hash_file(path: &Path) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    std::io::copy(&mut file, &mut hasher).map_err(|e| e.to_string())?;
    Ok(to_hex(&hasher.finalize()))
}

/// Downloads to a temporary file and moves it into place only after it passes every check.
pub fn install(
    download: &Download,
    destination: &Path,
    on_progress: impl FnMut(u64),
) -> Result<(), String> {
    let response = ureq::get(&download.url).call().map_err(|e| e.to_string())?;
    if !response.get_url().starts_with("https://") {
        return Err("The download was redirected to an insecure address.".into());
    }

    let directory = destination.parent().ok_or("Invalid install location.")?;
    fs::create_dir_all(directory).map_err(|e| e.to_string())?;
    let temp = destination.with_extension("download");
    let result = File::create(&temp)
        .map_err(|e| e.to_string())
        .and_then(|file| copy_verified(response.into_reader(), file, download, on_progress));
    if let Err(error) = result {
        let _ = fs::remove_file(&temp);
        return Err(error);
    }

    // Keep Windows' "downloaded from the internet" marker so that SmartScreen still applies.
    let marker = format!("{}:Zone.Identifier", temp.display());
    fs::write(&marker, "[ZoneTransfer]\r\nZoneId=3\r\n").map_err(|e| e.to_string())?;
    fs::rename(&temp, destination).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    const FOO_SHA256: &str = "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae";

    fn download(sha256: &str, size_bytes: u64) -> Download {
        Download {
            url: String::new(),
            file_name: String::new(),
            sha256: sha256.into(),
            size_bytes,
        }
    }

    fn check(sha256: &str, size: u64) -> Result<Vec<u8>, String> {
        let mut output = Vec::new();
        copy_verified(&b"foo"[..], &mut output, &download(sha256, size), |_| {})?;
        Ok(output)
    }

    #[test]
    fn accepts_a_matching_file() {
        assert_eq!(check(FOO_SHA256, 3).unwrap(), b"foo");
    }

    #[test]
    fn rejects_wrong_hash_and_size() {
        assert!(check(&"0".repeat(64), 3).unwrap_err().contains("hash"));
        assert!(check(FOO_SHA256, 2).unwrap_err().contains("larger"));
        assert!(check(FOO_SHA256, 4).unwrap_err().contains("incomplete"));
    }

    // Downloads a small real release file without running it: cargo test -- --ignored
    #[test]
    #[ignore = "needs the network"]
    fn installs_a_real_release() {
        let release = Download {
            url: "https://github.com/cli/cli/releases/download/v2.40.0/gh_2.40.0_checksums.txt"
                .into(),
            file_name: String::new(),
            sha256: "1e9270806bf85116c7fd351e6766d98b0862fbc0cec400cd133d4e274bdc58b5".into(),
            size_bytes: 1760,
        };
        let directory = std::env::temp_dir().join("opentrainer-install-test");
        let destination = directory.join("trainer.exe");
        let _ = fs::remove_file(&destination);
        install(&release, &destination, |_| {}).unwrap();
        assert_eq!(hash_file(&destination).unwrap(), release.sha256);
        assert!(
            fs::read_to_string(format!("{}:Zone.Identifier", destination.display()))
                .unwrap()
                .contains("ZoneId=3")
        );
        fs::remove_file(&destination).unwrap();
    }
}
