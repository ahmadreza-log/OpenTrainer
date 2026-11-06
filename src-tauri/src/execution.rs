use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::path::Path;
use std::ptr::null;
use windows_sys::Win32::UI::Shell::ShellExecuteW;
use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

fn wide(value: &OsStr) -> Vec<u16> {
    value.encode_wide().chain(Some(0)).collect()
}

/// Starts the trainer as its own process. ShellExecute lets Windows apply its own checks: the
/// trainer's administrator request shows a UAC prompt and SmartScreen sees the download marker.
pub fn launch(path: &Path) -> Result<(), String> {
    let directory = path.parent().ok_or("Invalid trainer location.")?;
    let file = wide(path.as_os_str());
    let directory = wide(directory.as_os_str());
    let verb = wide(OsStr::new("open"));

    // Safety: every pointer is a NUL-terminated buffer that outlives this call.
    let result = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            verb.as_ptr(),
            file.as_ptr(),
            null(),
            directory.as_ptr(),
            SW_SHOWNORMAL,
        )
    };
    // Per the API, values above 32 mean success.
    if result as isize > 32 {
        Ok(())
    } else {
        Err("Windows couldn't start the trainer, or the request was declined.".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reports_a_missing_file() {
        assert!(launch(Path::new(r"C:\does-not-exist\trainer.exe")).is_err());
    }

    // Starts a harmless Windows program to prove the launch path: cargo test -- --ignored
    #[test]
    #[ignore = "starts a process"]
    fn starts_a_real_program() {
        let system = std::env::var("SystemRoot").unwrap();
        launch(&Path::new(&system).join("System32").join("whoami.exe")).unwrap();
    }
}
