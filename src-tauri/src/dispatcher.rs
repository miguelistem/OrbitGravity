use std::path::{Path, PathBuf};
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct RegistryBackup {
    pub backed_up_at: String,
    pub antigravity_ide: String,
    pub antigravity: String,
}

pub fn get_local_app_data_dir() -> PathBuf {
    dirs::data_local_dir()
        .map(|d| d.join("BetterMultigravity"))
        .unwrap_or_else(|| PathBuf::from("."))
}

pub fn get_backup_path() -> PathBuf {
    get_local_app_data_dir().join("registry_backup.json")
}

pub fn ensure_dispatcher_scripts_exist() -> Result<(), String> {
    let app_dir = get_local_app_data_dir();
    let _ = std::fs::create_dir_all(&app_dir);

    let ps1_path = app_dir.join("dispatcher.ps1");
    if !ps1_path.exists() {
        let ps1_content = include_str!("../../scripts/dispatcher.ps1");
        std::fs::write(&ps1_path, ps1_content).map_err(|e| e.to_string())?;
    }

    let vbs_path = app_dir.join("dispatcher.vbs");
    if !vbs_path.exists() {
        let vbs_content = include_str!("../../scripts/dispatcher.vbs");
        std::fs::write(&vbs_path, vbs_content).map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub fn read_registry_protocol_command(key_name: &str) -> Option<String> {
    let script = format!(
        r#"(Get-ItemProperty 'HKCU:\Software\Classes\{}\shell\open\command' -ErrorAction SilentlyContinue).'(default)'"#,
        key_name
    );
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .output()
        .ok()?;
    if output.status.success() {
        let val = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !val.is_empty() {
            return Some(val);
        }
    }
    None
}

pub fn write_registry_protocol_command(key_name: &str, command_val: &str) -> Result<(), String> {
    let script = format!(
        r#"
        $path = 'HKCU:\Software\Classes\{}\shell\open\command';
        if (-not (Test-Path $path)) {{
            New-Item -Path $path -Force | Out-Null;
        }}
        Set-ItemProperty -Path $path -Name '(default)' -Value '{}' -Force;
        "#,
        key_name,
        command_val.replace('\'', "''")
    );
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .output()
        .map_err(|e| format!("Failed to execute PowerShell: {}", e))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn get_default_ide_binary() -> PathBuf {
    crate::detector::detect_binary_for_app_type("antigravity_ide")
        .unwrap_or_else(|| {
            dirs::data_local_dir()
                .or_else(|| std::env::var("LOCALAPPDATA").ok().map(PathBuf::from))
                .map(|d| d.join("Programs").join("Antigravity IDE").join("Antigravity IDE.exe"))
                .unwrap_or_else(|| PathBuf::from("Antigravity IDE.exe"))
        })
}

pub fn get_default_standalone_binary() -> PathBuf {
    crate::detector::detect_binary_for_app_type("antigravity")
        .unwrap_or_else(|| {
            dirs::data_local_dir()
                .or_else(|| std::env::var("LOCALAPPDATA").ok().map(PathBuf::from))
                .map(|d| d.join("Programs").join("antigravity").join("Antigravity.exe"))
                .unwrap_or_else(|| PathBuf::from("Antigravity.exe"))
        })
}

pub fn enable_dispatcher() -> Result<bool, String> {
    ensure_dispatcher_scripts_exist()?;
    let app_dir = get_local_app_data_dir();
    let vbs_path = app_dir.join("dispatcher.vbs");

    // 1. Back up original registry keys if not already done
    let backup_path = get_backup_path();
    let (default_ide_cmd, default_stand_cmd) = default_commands();
    if !backup_path.exists() {
        let ide_curr = read_registry_protocol_command("antigravity-ide")
            .unwrap_or(default_ide_cmd);
        let stand_curr = read_registry_protocol_command("antigravity")
            .unwrap_or(default_stand_cmd);
        let backup = RegistryBackup {
            backed_up_at: chrono::Utc::now().to_rfc3339(),
            antigravity_ide: ide_curr,
            antigravity: stand_curr,
        };
        if let Ok(json) = serde_json::to_string_pretty(&backup) {
            let _ = std::fs::write(&backup_path, json);
        }
    }

    // 2. Set dispatcher command
    let dispatcher_cmd = format!(r#"wscript.exe "{}" "%1""#, vbs_path.to_string_lossy());
    write_registry_protocol_command("antigravity-ide", &dispatcher_cmd)?;
    write_registry_protocol_command("antigravity", &dispatcher_cmd)?;

    Ok(true)
}

pub fn restore_original_protocols() -> Result<bool, String> {
    let backup_path = get_backup_path();
    let (ide_cmd, stand_cmd) = if backup_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&backup_path) {
            if let Ok(backup) = serde_json::from_str::<RegistryBackup>(&content) {
                (backup.antigravity_ide, backup.antigravity)
            } else {
                default_commands()
            }
        } else {
            default_commands()
        }
    } else {
        default_commands()
    };

    write_registry_protocol_command("antigravity-ide", &ide_cmd)?;
    write_registry_protocol_command("antigravity", &stand_cmd)?;

    Ok(true)
}

fn default_commands() -> (String, String) {
    let ide_path = get_default_ide_binary();
    let stand_path = get_default_standalone_binary();

    (
        format!(r#""{}" "--open-url" "--" "%1""#, ide_path.to_string_lossy()),
        format!(r#""{}" "%1""#, stand_path.to_string_lossy()),
    )
}

pub fn is_dispatcher_active() -> bool {
    if let Some(cmd) = read_registry_protocol_command("antigravity-ide") {
        return cmd.to_lowercase().contains("dispatcher.vbs");
    }
    false
}

pub fn set_active_target_id(id: &str) -> Result<(), String> {
    let target_file = get_local_app_data_dir().join("active_target.txt");
    std::fs::write(target_file, id).map_err(|e| e.to_string())
}

pub fn route_url_to_instance(profile_dir: &str, app_type: &str, binary_path: Option<&str>, url: &str) -> Result<(), String> {
    let data_dir = Path::new(profile_dir).join("data");
    let ext_dir = Path::new(profile_dir).join("extensions");
    
    let bin = match binary_path {
        Some(b) if Path::new(b).exists() => PathBuf::from(b),
        _ => crate::detector::detect_binary_for_app_type(app_type)
            .unwrap_or_else(|| {
                if app_type == "antigravity" {
                    get_default_standalone_binary()
                } else {
                    get_default_ide_binary()
                }
            }),
    };

    let mut cmd = Command::new(&bin);
    if bin.to_string_lossy().contains("Antigravity IDE") {
        cmd.arg(format!("--user-data-dir={}", data_dir.display()))
           .arg(format!("--extensions-dir={}", ext_dir.display()))
           .arg("--open-url")
           .arg("--")
           .arg(url);
    } else {
        cmd.arg(format!("--user-data-dir={}", data_dir.display()))
           .arg(url);
    }

    cmd.spawn().map_err(|e| format!("Failed to route url: {}", e))?;
    Ok(())
}
