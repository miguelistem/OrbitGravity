use std::path::PathBuf;
use crate::models::AntigravityBinaryInfo;

/// Detects the installation path of Google Antigravity or Antigravity IDE on Windows.
pub fn detect_antigravity_binary() -> Option<PathBuf> {
    detect_all_antigravity_binaries().into_iter().next().map(|b| PathBuf::from(b.path))
}

/// Detects the binary matching a specific application variant (IDE vs Desktop client).
pub fn detect_binary_for_app_type(app_type: &str) -> Option<PathBuf> {
    let binaries = detect_all_antigravity_binaries();
    let lower_type = app_type.to_lowercase();
    if lower_type.contains("ide") {
        if let Some(b) = binaries.iter().find(|b| b.kind == "ide") {
            return Some(PathBuf::from(&b.path));
        }
    } else {
        if let Some(b) = binaries.iter().find(|b| b.kind == "app") {
            return Some(PathBuf::from(&b.path));
        }
    }
    // Fallback to first available detected binary
    binaries.into_iter().next().map(|b| PathBuf::from(b.path))
}

/// Discovers all installed Antigravity variants (IDE vs Desktop client).
pub fn detect_all_antigravity_binaries() -> Vec<AntigravityBinaryInfo> {
    let mut found: Vec<AntigravityBinaryInfo> = Vec::new();
    let mut seen_paths: std::collections::HashSet<String> = std::collections::HashSet::new();

    let mut has_ide = false;
    let mut has_app = false;

    let mut check_and_add = |name: &str, kind: &str, path: PathBuf, ide_flag: &mut bool, app_flag: &mut bool| {
        if path.exists() && path.is_file() {
            let canonical = path.to_string_lossy().to_string();
            let lower = canonical.to_lowercase();
            if !seen_paths.contains(&lower) {
                seen_paths.insert(lower);
                if kind == "ide" { *ide_flag = true; }
                if kind == "app" { *app_flag = true; }
                found.push(AntigravityBinaryInfo {
                    name: name.to_string(),
                    path: canonical,
                    kind: kind.to_string(),
                });
            }
        }
    };

    // 1. User LocalAppData paths
    if let Some(local_app_data) = dirs::data_local_dir() {
        check_and_add("Antigravity IDE", "ide", local_app_data.join("Programs").join("Antigravity IDE").join("Antigravity IDE.exe"), &mut has_ide, &mut has_app);
        check_and_add("Antigravity Desktop", "app", local_app_data.join("Programs").join("antigravity").join("Antigravity.exe"), &mut has_ide, &mut has_app);
        check_and_add("Antigravity Desktop", "app", local_app_data.join("Programs").join("antigravity").join("antigravity.exe"), &mut has_ide, &mut has_app);
        check_and_add("Antigravity Desktop", "app", local_app_data.join("Programs").join("Antigravity").join("Antigravity.exe"), &mut has_ide, &mut has_app);
        check_and_add("Antigravity IDE", "ide", local_app_data.join("Antigravity IDE").join("Antigravity IDE.exe"), &mut has_ide, &mut has_app);
        check_and_add("Antigravity Desktop", "app", local_app_data.join("antigravity").join("Antigravity.exe"), &mut has_ide, &mut has_app);
    }

    // 2. User home fallback
    if let Some(home) = dirs::home_dir() {
        check_and_add("Antigravity IDE", "ide", home.join("AppData").join("Local").join("Programs").join("Antigravity IDE").join("Antigravity IDE.exe"), &mut has_ide, &mut has_app);
        check_and_add("Antigravity Desktop", "app", home.join("AppData").join("Local").join("Programs").join("antigravity").join("Antigravity.exe"), &mut has_ide, &mut has_app);
        check_and_add("Antigravity Desktop", "app", home.join("AppData").join("Local").join("Programs").join("antigravity").join("antigravity.exe"), &mut has_ide, &mut has_app);
        check_and_add("Antigravity Desktop", "app", home.join("AppData").join("Local").join("Programs").join("Antigravity").join("Antigravity.exe"), &mut has_ide, &mut has_app);
    }

    // 3. Program Files
    if let Ok(prog_files) = std::env::var("ProgramFiles") {
        let p = PathBuf::from(prog_files);
        check_and_add("Antigravity IDE", "ide", p.join("Antigravity IDE").join("Antigravity IDE.exe"), &mut has_ide, &mut has_app);
        check_and_add("Antigravity Desktop", "app", p.join("Antigravity").join("Antigravity.exe"), &mut has_ide, &mut has_app);
    }
    if let Ok(prog_files_x86) = std::env::var("ProgramFiles(x86)") {
        let p = PathBuf::from(prog_files_x86);
        check_and_add("Antigravity IDE", "ide", p.join("Antigravity IDE").join("Antigravity IDE.exe"), &mut has_ide, &mut has_app);
        check_and_add("Antigravity Desktop", "app", p.join("Antigravity").join("Antigravity.exe"), &mut has_ide, &mut has_app);
    }

    // 4. Try PATH lookup via `where.exe` only if both kinds are not yet found
    if !has_ide || !has_app {
        if let Ok(output) = crate::process::silent_command("where.exe")
            .args(["Antigravity IDE.exe", "Antigravity.exe", "antigravity.exe"])
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    let trimmed = line.trim();
                    if !trimmed.is_empty() {
                        let path = PathBuf::from(trimmed);
                        let name = if trimmed.to_lowercase().contains("ide") {
                            "Antigravity IDE"
                        } else {
                            "Antigravity Desktop"
                        };
                        let kind = if trimmed.to_lowercase().contains("ide") { "ide" } else { "app" };
                        check_and_add(name, kind, path, &mut has_ide, &mut has_app);
                    }
                }
            }
        }
    }

    found
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
        std::env::var("USERPROFILE")
            .map(|u| PathBuf::from(u).join(".antigravity-ide").join("extensions"))
            .unwrap_or_else(|_| PathBuf::from(".antigravity-ide").join("extensions"))
    }
}

/// Expands environment variable placeholders (e.g. %USERPROFILE%, %LOCALAPPDATA%, %APPDATA%, ~/)
/// into canonical, absolute filesystem paths. Prevents Win32 APIs from treating placeholders as literal names.
pub fn expand_path_str(p: &str) -> PathBuf {
    let trimmed = p.trim();
    if trimmed.is_empty() {
        return PathBuf::new();
    }

    let mut s = trimmed.to_string();

    // Check for Windows %ENV% variables
    if s.contains('%') {
        if let Some(home) = dirs::home_dir() {
            let h = home.to_string_lossy();
            s = s.replace("%USERPROFILE%", &h)
                 .replace("%userprofile%", &h)
                 .replace("%UserProfile%", &h);
        }
        if let Some(local) = dirs::data_local_dir() {
            let l = local.to_string_lossy();
            s = s.replace("%LOCALAPPDATA%", &l)
                 .replace("%localappdata%", &l)
                 .replace("%LocalAppData%", &l);
        }
        if let Some(roaming) = dirs::config_dir() {
            let r = roaming.to_string_lossy();
            s = s.replace("%APPDATA%", &r)
                 .replace("%appdata%", &r)
                 .replace("%AppData%", &r);
        }
    }

    // Check for Unix/PowerShell style ~/
    if s.starts_with("~/") || s.starts_with("~\\") {
        if let Some(home) = dirs::home_dir() {
            return home.join(&s[2..]);
        }
    }

    PathBuf::from(s)
}

/// Helper to expand Path references containing environment placeholders.
pub fn expand_path(p: &std::path::Path) -> PathBuf {
    expand_path_str(&p.to_string_lossy())
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

    let status = crate::process::silent_command("cmd.exe")
        .args(["/C", "mklink", "/J", link.to_str().unwrap_or(""), target.to_str().unwrap_or("")])
        .output();

    let success = match status {
        Ok(output) => output.status.success() && link.exists(),
        Err(_) => false,
    };

    // Cleanup
    let _ = crate::process::silent_command("cmd.exe")
        .args(["/C", "rmdir", link.to_str().unwrap_or("")])
        .output();
    let _ = std::fs::remove_dir_all(&test_dir);

    success
}
