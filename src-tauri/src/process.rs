use std::path::Path;
use sysinfo::{ProcessesToUpdate, System, Pid};
use crate::models::Instance;
use crate::detector::detect_antigravity_binary;
use crate::junction::setup_profile_directories;

/// Refreshes the running status and PIDs of all instances.
pub fn refresh_instances_status(instances: &mut [Instance]) {
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    for instance in instances.iter_mut() {
        let profile_norm = instance.profile_dir.to_lowercase().replace('/', "\\");
        let mut is_running = false;
        let mut found_pid: Option<u32> = None;

        // Check if recorded PID is still alive and matches
        if let Some(pid_u32) = instance.pid {
            let sys_pid = Pid::from_u32(pid_u32);
            if let Some(proc) = sys.process(sys_pid) {
                let name = proc.name().to_string_lossy().to_lowercase();
                let cmd: Vec<String> = proc.cmd().iter().map(|s| s.to_string_lossy().to_string()).collect();
                let cmd_str = cmd.join(" ").to_lowercase();

                if name.contains("antigravity") || cmd_str.contains(&profile_norm) {
                    is_running = true;
                    found_pid = Some(pid_u32);
                }
            }
        }

        // If not found via existing PID, search all processes by command line / user-data-dir
        if !is_running {
            for (pid, proc) in sys.processes() {
                let name = proc.name().to_string_lossy().to_lowercase();
                let cmd: Vec<String> = proc.cmd().iter().map(|s| s.to_string_lossy().to_string()).collect();
                let cmd_str = cmd.join(" ").to_lowercase();

                if (name.contains("antigravity") || cmd_str.contains("antigravity")) && cmd_str.contains(&profile_norm) {
                    is_running = true;
                    found_pid = Some(pid.as_u32());
                    break;
                }
            }
        }

        if is_running {
            instance.status = "running".to_string();
            instance.pid = found_pid;
        } else {
            instance.status = "stopped".to_string();
            instance.pid = None;
        }
    }
}

/// Spawns an Antigravity instance with complete environment isolation.
pub fn launch_antigravity_instance(instance: &mut Instance) -> Result<(), String> {
    let binary_path = detect_antigravity_binary()
        .ok_or_else(|| "Antigravity binary not found on the system. Please ensure Antigravity IDE is installed.".to_string())?;

    let profile_path = Path::new(&instance.profile_dir);
    setup_profile_directories(profile_path, &instance.mode)?;

    let data_dir = profile_path.join("data");
    let extensions_dir = profile_path.join("extensions");
    let roaming_dir = profile_path.join("appdata").join("Roaming");
    let local_dir = profile_path.join("appdata").join("Local");

    let mut cmd = std::process::Command::new(&binary_path);

    // Command-line arguments for profile isolation
    cmd.arg(format!("--user-data-dir={}", data_dir.display()))
       .arg(format!("--extensions-dir={}", extensions_dir.display()))
       .arg("--new-window");

    // Optional workspace directory
    if let Some(ref ws) = instance.workspace_path {
        let trimmed = ws.trim();
        if !trimmed.is_empty() {
            cmd.arg(trimmed);
        }
    }

    // Set isolated Windows environment variables so credentials/sessions never collide
    cmd.env("APPDATA", roaming_dir.as_os_str())
       .env("LOCALAPPDATA", local_dir.as_os_str())
       .env("USERPROFILE", profile_path.as_os_str())
       .env("BETTERMULTIGRAVITY_INSTANCE_ID", &instance.id)
       .env("BETTERMULTIGRAVITY_PORT", instance.port.to_string())
       .stdin(std::process::Stdio::null())
       .stdout(std::process::Stdio::null())
       .stderr(std::process::Stdio::null());

    let child = cmd.spawn()
        .map_err(|e| format!("Failed to spawn Antigravity process: {}", e))?;

    let pid = child.id();
    instance.pid = Some(pid);
    instance.status = "running".to_string();
    instance.last_used = "Just now".to_string();

    Ok(())
}

/// Terminates an Antigravity instance and all its child processes.
pub fn stop_antigravity_instance(instance: &mut Instance) -> Result<(), String> {
    if let Some(pid) = instance.pid {
        // Kill process tree cleanly using taskkill
        let _ = std::process::Command::new("taskkill.exe")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .output();
    }

    // Also check if any lingering process uses the profile dir
    let profile_norm = instance.profile_dir.to_lowercase().replace('/', "\\");
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    for (pid, proc) in sys.processes() {
        let cmd: Vec<String> = proc.cmd().iter().map(|s| s.to_string_lossy().to_string()).collect();
        let cmd_str = cmd.join(" ").to_lowercase();
        if cmd_str.contains(&profile_norm) {
            let _ = std::process::Command::new("taskkill.exe")
                .args(["/PID", &pid.as_u32().to_string(), "/T", "/F"])
                .output();
        }
    }

    instance.status = "stopped".to_string();
    instance.pid = None;
    instance.last_used = "Just now".to_string();

    Ok(())
}
