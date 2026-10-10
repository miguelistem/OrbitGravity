use std::path::PathBuf;

/// Detects the installation path of Google Antigravity or Antigravity IDE on Windows.
pub fn detect_antigravity_binary() -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    // 1. User LocalAppData paths
    if let Some(local_app_data) = dirs::data_local_dir() {
        // e.g. C:\Users\<User>\AppData\Local\Programs\Antigravity IDE\Antigravity IDE.exe
        candidates.push(local_app_data.join("Programs").join("Antigravity IDE").join("Antigravity IDE.exe"));
        candidates.push(local_app_data.join("Programs").join("antigravity").join("Antigravity.exe"));
        candidates.push(local_app_data.join("Programs").join("Antigravity").join("Antigravity.exe"));
        candidates.push(local_app_data.join("Antigravity IDE").join("Antigravity IDE.exe"));
        candidates.push(local_app_data.join("antigravity").join("Antigravity.exe"));
    }

    // 2. User home fallback
    if let Some(home) = dirs::home_dir() {
        candidates.push(home.join("AppData").join("Local").join("Programs").join("Antigravity IDE").join("Antigravity IDE.exe"));
        candidates.push(home.join("AppData").join("Local").join("Programs").join("antigravity").join("Antigravity.exe"));
        candidates.push(home.join("AppData").join("Local").join("Programs").join("Antigravity").join("Antigravity.exe"));
    }

    // 3. Program Files
    if let Ok(prog_files) = std::env::var("ProgramFiles") {
        let p = PathBuf::from(prog_files);
        candidates.push(p.join("Antigravity IDE").join("Antigravity IDE.exe"));
        candidates.push(p.join("Antigravity").join("Antigravity.exe"));
    }
    if let Ok(prog_files_x86) = std::env::var("ProgramFiles(x86)") {
        let p = PathBuf::from(prog_files_x86);
        candidates.push(p.join("Antigravity IDE").join("Antigravity IDE.exe"));
        candidates.push(p.join("Antigravity").join("Antigravity.exe"));
    }

    // Check each candidate path
    for candidate in &candidates {
        if candidate.exists() && candidate.is_file() {
            return Some(candidate.clone());
        }
    }

    // 4. Try PATH lookup via `where.exe`
    if let Ok(output) = std::process::Command::new("where.exe")
        .args(["Antigravity IDE.exe", "Antigravity.exe", "antigravity.exe"])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    let path = PathBuf::from(trimmed);
                    if path.exists() && path.is_file() {
                        return Some(path);
                    }
                }
            }
        }
    }

    None
}

/// Returns the base directory for all Antigravity profiles (%USERPROFILE%\AntigravityProfiles).
pub fn get_base_profiles_dir() -> PathBuf {
    if let Some(home) = dirs::home_dir() {
        home.join("AntigravityProfiles")
    } else {
        PathBuf::from(r"C:\AntigravityProfiles")
    }
}

/// Discovers the primary system extensions directory to share via NTFS Junctions.
pub fn get_system_extensions_dir() -> PathBuf {
    if let Some(home) = dirs::home_dir() {
        let ide_ext = home.join(".antigravity-ide").join("extensions");
        if ide_ext.exists() {
            return ide_ext;
        }

        let standard_ext = home.join(".antigravity").join("extensions");
        if standard_ext.exists() {
            return standard_ext;
        }

        // Return .antigravity-ide/extensions as default target
        ide_ext
    } else {
        PathBuf::from(r"C:\Users\Default\.antigravity-ide\extensions")
    }
}

/// Tests NTFS Directory Junction support on the system.
pub fn check_junction_support() -> bool {
    let temp_dir = std::env::temp_dir();
    let test_dir = temp_dir.join(format!("bm_junc_test_{}", uuid::Uuid::new_v4()));
    let target = test_dir.join("target");
    let link = test_dir.join("link");

    if std::fs::create_dir_all(&target).is_err() {
        return false;
    }

    let status = std::process::Command::new("cmd.exe")
        .args(["/C", "mklink", "/J", link.to_str().unwrap_or(""), target.to_str().unwrap_or("")])
        .output();

    let success = match status {
        Ok(output) => output.status.success() && link.exists(),
        Err(_) => false,
    };

    // Cleanup
    let _ = std::process::Command::new("cmd.exe")
        .args(["/C", "rmdir", link.to_str().unwrap_or("")])
        .output();
    let _ = std::fs::remove_dir_all(&test_dir);

    success
}
