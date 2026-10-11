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
    let file_name = format!("{}.lnk", sanitized_name.trim());

    if loc == "start_menu" || loc == "startmenu" {
        if let Some(roaming) = dirs::config_dir() {
            // %APPDATA%\Microsoft\Windows\Start Menu\Programs\OrbitGravity
            let start_menu_folder = roaming
                .join("Microsoft")
                .join("Windows")
                .join("Start Menu")
                .join("Programs")
                .join("OrbitGravity");
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

/// Writes launch.bat into profile directory and creates a desktop .lnk with the Antigravity icon.
pub fn create_instance_desktop_shortcut(
    instance: &crate::models::Instance,
    target_binary: &Path,
    location: Option<&str>,
) -> Result<PathBuf, String> {
    let profile_path = Path::new(&instance.profile_dir);
    let data_dir = profile_path.join("data");
    let ext_dir = profile_path.join("extensions");
    
    let _ = std::fs::create_dir_all(profile_path);
    let _ = std::fs::create_dir_all(&data_dir);
    let _ = std::fs::create_dir_all(&ext_dir);
    
    let bat_path = profile_path.join("launch.bat");
    
    let mut custom_flags_str = String::new();
    if let Some(ref flags) = instance.custom_flags {
        let trimmed = flags.trim();
        if !trimmed.is_empty() {
            custom_flags_str.push(' ');
            custom_flags_str.push_str(trimmed);
        }
    }
    
    let mut ws_arg = String::new();
    if let Some(ref ws) = instance.workspace_path {
        let trimmed = ws.trim();
        if !trimmed.is_empty() {
            ws_arg.push_str(&format!(" \"{}\"", trimmed));
        }
    }
    
    let mut env_lines = String::new();
    if let Some(ref envs) = instance.env_vars {
        for (k, v) in envs {
            env_lines.push_str(&format!("set {}={}\r\n", k, v));
        }
    }

    let bat_content = format!(
        "@echo off\r\n\
         title Antigravity - {name}\r\n\
         REM OrbitGravity isolated profile launcher\r\n\
         set SSH_CONNECTION=127.0.0.1 1234 127.0.0.1 22\r\n\
         {env_lines}\
         start \"\" \"{bin}\" --user-data-dir=\"{data}\" --extensions-dir=\"{ext}\" --new-window{flags}{ws}\r\n",
        name = instance.name,
        env_lines = env_lines,
        bin = target_binary.display(),
        data = data_dir.display(),
        ext = ext_dir.display(),
        flags = custom_flags_str,
        ws = ws_arg,
    );
    
    std::fs::write(&bat_path, bat_content)
        .map_err(|e| format!("Failed to write launch.bat: {}", e))?;

    let shortcut_path = get_shortcut_destination(&instance.name, location);
    
    if let Some(parent) = shortcut_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let ps_escape = |s: &str| -> String {
        s.replace('\'', "''")
    };

    let script = format!(
        "$ws = New-Object -ComObject WScript.Shell; \
         $s = $ws.CreateShortcut('{shortcut}'); \
         $s.TargetPath = '{target}'; \
         $s.WorkingDirectory = '{workdir}'; \
         $s.IconLocation = '{icon},0'; \
         $s.WindowStyle = 7; \
         $s.Description = 'Launch Antigravity profile {name}'; \
         $s.Save();",
        shortcut = ps_escape(shortcut_path.to_str().unwrap_or("")),
        target = ps_escape(bat_path.to_str().unwrap_or("")),
        workdir = ps_escape(profile_path.to_str().unwrap_or("")),
        icon = ps_escape(target_binary.to_str().unwrap_or("")),
        name = ps_escape(&instance.name),
    );

    let output = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .output()
        .map_err(|e| format!("Failed to invoke PowerShell for shortcut creation: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("PowerShell shortcut creation failed: {}", stderr.trim()));
    }

    Ok(shortcut_path)
}
