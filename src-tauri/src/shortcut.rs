use std::path::{Path, PathBuf};

/// Creates a Windows shortcut (.lnk file) using PowerShell COM WScript.Shell.
pub fn create_windows_shortcut(
    shortcut_path: &Path,
    target_binary: &Path,
    arguments: &str,
    working_dir: &Path,
    description: &str,
) -> Result<(), String> {
    if let Some(parent) = shortcut_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create shortcut parent folder: {}", e))?;
    }

    let ps_escape = |s: &str| -> String {
        s.replace('\'', "''")
    };

    let script = format!(
        "$ws = New-Object -ComObject WScript.Shell; \
         $s = $ws.CreateShortcut('{shortcut}'); \
         $s.TargetPath = '{target}'; \
         $s.Arguments = '{args}'; \
         $s.WorkingDirectory = '{workdir}'; \
         $s.IconLocation = '{target},0'; \
         $s.Description = '{desc}'; \
         $s.Save();",
        shortcut = ps_escape(shortcut_path.to_str().unwrap_or("")),
        target = ps_escape(target_binary.to_str().unwrap_or("")),
        args = ps_escape(arguments),
        workdir = ps_escape(working_dir.to_str().unwrap_or("")),
        desc = ps_escape(description),
    );

    let output = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .output()
        .map_err(|e| format!("Failed to invoke PowerShell for shortcut creation: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("PowerShell shortcut creation failed: {}", stderr.trim()));
    }

    if !shortcut_path.exists() {
        return Err("Shortcut file was not created on disk.".to_string());
    }

    Ok(())
}

/// Resolves standard destination path for the shortcut.
pub fn get_shortcut_destination(instance_name: &str, location: Option<&str>) -> PathBuf {
    let loc = location.unwrap_or("desktop").to_lowercase();
    let sanitized_name = instance_name.replace(['\\', '/', ':', '*', '?', '"', '<', '>', '|'], "_");
    let file_name = format!("BetterMultigravity - {}.lnk", sanitized_name);

    if loc == "start_menu" || loc == "startmenu" {
        if let Some(roaming) = dirs::config_dir() {
            // %APPDATA%\Microsoft\Windows\Start Menu\Programs\BetterMultigravity
            let start_menu_folder = roaming
                .join("Microsoft")
                .join("Windows")
                .join("Start Menu")
                .join("Programs")
                .join("BetterMultigravity");
            return start_menu_folder.join(file_name);
        }
    }

    // Default: Desktop
    if let Some(desktop) = dirs::desktop_dir() {
        desktop.join(file_name)
    } else if let Some(home) = dirs::home_dir() {
        home.join("Desktop").join(file_name)
    } else {
        PathBuf::from(r"C:\Users\Public\Desktop").join(file_name)
    }
}
