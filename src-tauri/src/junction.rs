use std::path::Path;
use crate::detector::get_system_extensions_dir;

/// Creates an NTFS Directory Junction from `link` pointing to `target`.
/// Does NOT require Administrator privileges on Windows.
pub fn create_junction(link: &Path, target: &Path) -> Result<(), String> {
    if link.exists() {
        return Ok(());
    }

    // Ensure parent directory exists
    if let Some(parent) = link.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory for junction: {}", e))?;
    }

    // Ensure target exists
    if !target.exists() {
        std::fs::create_dir_all(target)
            .map_err(|e| format!("Failed to create target directory: {}", e))?;
    }

    let link_str = link.to_str().ok_or("Invalid link path unicode")?;
    let target_str = target.to_str().ok_or("Invalid target path unicode")?;

    let output = std::process::Command::new("cmd.exe")
        .args(["/C", "mklink", "/J", link_str, target_str])
        .output()
        .map_err(|e| format!("Failed to execute mklink command: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        // Fallback: if junction creation fails (e.g. cross-volume), create normal directory
        let _ = std::fs::create_dir_all(link);
        return Err(format!("mklink /J failed: stdout='{}' stderr='{}'", stdout.trim(), stderr.trim()));
    }

    Ok(())
}

/// Safely unlinks an NTFS junction using `rmdir` so target files are preserved.
pub fn remove_junction(link: &Path) -> Result<(), String> {
    if !link.exists() {
        return Ok(());
    }

    let link_str = link.to_str().ok_or("Invalid link path")?;
    let output = std::process::Command::new("cmd.exe")
        .args(["/C", "rmdir", link_str])
        .output()
        .map_err(|e| format!("Failed to execute rmdir: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("rmdir failed: {}", stderr.trim()));
    }

    Ok(())
}

/// Sets up the complete isolated directory structure for an Antigravity profile.
pub fn setup_profile_directories(profile_dir: &Path, mode: &str) -> Result<(), String> {
    let data_dir = profile_dir.join("data");
    let extensions_dir = profile_dir.join("extensions");
    let roaming_dir = profile_dir.join("appdata").join("Roaming");
    let local_dir = profile_dir.join("appdata").join("Local");

    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create profile data directory: {}", e))?;
    std::fs::create_dir_all(&roaming_dir)
        .map_err(|e| format!("Failed to create isolated Roaming directory: {}", e))?;
    std::fs::create_dir_all(&local_dir)
        .map_err(|e| format!("Failed to create isolated Local directory: {}", e))?;

    if mode == "auth-only" {
        let system_extensions = get_system_extensions_dir();
        if !extensions_dir.exists() {
            if let Err(e) = create_junction(&extensions_dir, &system_extensions) {
                log::warn!("Junction creation returned warning/error, verifying fallback: {}", e);
                if !extensions_dir.exists() {
                    let _ = std::fs::create_dir_all(&extensions_dir);
                }
            }
        }
    } else {
        // 'full' mode: isolated empty extensions directory
        if !extensions_dir.exists() {
            std::fs::create_dir_all(&extensions_dir)
                .map_err(|e| format!("Failed to create extensions directory: {}", e))?;
        }
    }

    Ok(())
}
