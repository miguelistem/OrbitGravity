use std::path::Path;
use sysinfo::{ProcessesToUpdate, System, Pid, ProcessRefreshKind};
use crate::models::Instance;
use crate::detector::detect_binary_for_app_type;
use crate::junction::setup_profile_directories;

/// Creates a Command that on Windows runs with CREATE_NO_WINDOW (0x08000000),
/// preventing any console windows from briefly flashing or popping up.
pub fn silent_command<S: AsRef<std::ffi::OsStr>>(program: S) -> std::process::Command {
    let mut cmd = std::process::Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }
    cmd
}

/// Refreshes the running status and PIDs of all instances.
pub fn refresh_instances_status(instances: &mut [Instance]) {
    let mut sys = System::new();
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::everything(),
    );

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

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ParentProcessInfo {
    pub is_running: bool,
    pub app_running: bool,
    pub ide_running: bool,
    pub pids: Vec<u32>,
}

/// Helper to determine if a process is a genuine parent Antigravity/IDE process
/// rather than an isolated instance profile sandbox.
pub fn is_parent_antigravity_process(name: &str, cmd_str: &str) -> (bool, bool) {
    let name_lower = name.to_lowercase();
    let cmd_lower = cmd_str.to_lowercase();

    let is_antigravity = name_lower.contains("antigravity")
        || cmd_lower.contains("antigravity.exe")
        || cmd_lower.contains("antigravity ide.exe");

    if !is_antigravity {
        return (false, false);
    }

    // Defensive check: If cmd_str is empty/whitespace, we cannot verify whether
    // --user-data-dir is present. We must NEVER assume an unknown CLI is the parent app,
    // as doing so could falsely classify an instance sandbox and trigger accidental termination.
    if cmd_lower.trim().is_empty() {
        return (false, false);
    }

    // Isolated profile sandboxes ALWAYS include --user-data-dir in their CLI arguments.
    // Genuine parent processes NEVER include --user-data-dir.
    // Also guard against profile folder names in cmd line.
    if cmd_lower.contains("--user-data-dir") || cmd_lower.contains("antigravityprofile") {
        return (false, false);
    }

    let is_ide = name_lower.contains("ide") || cmd_lower.contains("ide");
    (true, is_ide)
}

/// Retrieves real-time process telemetry for genuine parent Antigravity / IDE applications.
pub fn get_parent_process_info() -> ParentProcessInfo {
    get_parent_process_info_with_tracked(None)
}

/// Retrieves real-time process telemetry with optional active tracked PIDs.
pub fn get_parent_process_info_with_tracked(tracked_pids: Option<&[u32]>) -> ParentProcessInfo {
    let mut sys = System::new();
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::everything(),
    );

    let mut app_running = false;
    let mut ide_running = false;
    let mut pids = Vec::new();

    // Check tracked PIDs if supplied
    if let Some(tracked) = tracked_pids {
        for &pid_u32 in tracked {
            let sys_pid = Pid::from_u32(pid_u32);
            if let Some(proc) = sys.process(sys_pid) {
                let name = proc.name().to_string_lossy().to_lowercase();
                let cmd: Vec<String> = proc.cmd().iter().map(|s| s.to_string_lossy().to_string()).collect();
                let cmd_str = cmd.join(" ").to_lowercase();
                // Never treat a profile sandbox as parent even if PID was in tracked
                if cmd_str.contains("--user-data-dir") || cmd_str.contains("antigravityprofile") {
                    continue;
                }
                let is_ide = name.contains("ide") || cmd_str.contains("ide");
                if is_ide {
                    ide_running = true;
                } else {
                    app_running = true;
                }
                if !pids.contains(&pid_u32) {
                    pids.push(pid_u32);
                }
            }
        }
    }

    // Process table scan for genuine parent application
    for (pid, proc) in sys.processes() {
        let name = proc.name().to_string_lossy();
        let cmd: Vec<String> = proc.cmd().iter().map(|s| s.to_string_lossy().to_string()).collect();
        let cmd_str = cmd.join(" ");

        let (is_parent, is_ide) = is_parent_antigravity_process(&name, &cmd_str);
        if is_parent {
            if is_ide {
                ide_running = true;
            } else {
                app_running = true;
            }
            let pid_u32 = pid.as_u32();
            if !pids.contains(&pid_u32) {
                pids.push(pid_u32);
            }
        }
    }

    ParentProcessInfo {
        is_running: app_running || ide_running,
        app_running,
        ide_running,
        pids,
    }
}

/// Checks whether the genuine parent Antigravity or Antigravity IDE application is currently active.
pub fn is_parent_antigravity_running() -> bool {
    is_parent_antigravity_running_with_tracked(None)
}

pub fn is_parent_antigravity_running_with_tracked(tracked_pids: Option<&[u32]>) -> bool {
    get_parent_process_info_with_tracked(tracked_pids).is_running
}

/// Terminates genuine parent Antigravity / IDE processes using Windows taskkill.
pub fn terminate_parent_antigravity(variant: Option<&str>) -> Result<usize, String> {
    terminate_parent_antigravity_with_tracked(variant, None)
}

pub fn terminate_parent_antigravity_with_tracked(variant: Option<&str>, tracked_pids: Option<&[u32]>) -> Result<usize, String> {
    let mut sys = System::new();
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::everything(),
    );

    let mut pids_to_kill = Vec::new();
    let filter = variant.unwrap_or("all").to_lowercase();

    // Include any tracked PIDs after verifying they are NOT profile sandboxes
    if let Some(tracked) = tracked_pids {
        for &pid_u32 in tracked {
            let sys_pid = Pid::from_u32(pid_u32);
            if let Some(proc) = sys.process(sys_pid) {
                let cmd: Vec<String> = proc.cmd().iter().map(|s| s.to_string_lossy().to_string()).collect();
                let cmd_str = cmd.join(" ").to_lowercase();
                if cmd_str.contains("--user-data-dir") || cmd_str.contains("antigravityprofile") {
                    continue;
                }
            }
            if !pids_to_kill.contains(&pid_u32) {
                pids_to_kill.push(pid_u32);
            }
        }
    }

    for (pid, proc) in sys.processes() {
        let name = proc.name().to_string_lossy();
        let cmd: Vec<String> = proc.cmd().iter().map(|s| s.to_string_lossy().to_string()).collect();
        let cmd_str = cmd.join(" ");

        let (is_parent, is_ide) = is_parent_antigravity_process(&name, &cmd_str);
        if is_parent {
            let should_kill = match filter.as_str() {
                "ide" => is_ide,
                "app" => !is_ide,
                _ => true,
            };

            if should_kill {
                let pid_u32 = pid.as_u32();
                if !pids_to_kill.contains(&pid_u32) {
                    pids_to_kill.push(pid_u32);
                }
            }
        }
    }

    if pids_to_kill.is_empty() {
        return Ok(0);
    }

    let mut killed_count = 0;
    for pid in &pids_to_kill {
        let _ = silent_command("taskkill.exe")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .output();
        killed_count += 1;
    }

    Ok(killed_count)
}

/// Enforces mutual exclusion:
/// 1. Black Hole: Parent app and tethered instances cannot run concurrently.
/// 2. Solar Systems: Only one instance per app variant (Desktop vs IDE) can run in a category at a time.
pub fn check_launch_concurrency_guard(target: &Instance, all_instances: &[Instance]) -> Result<(), String> {
    check_launch_concurrency_guard_with_tracked(target, all_instances, None)
}

pub fn check_launch_concurrency_guard_with_tracked(
    target: &Instance,
    all_instances: &[Instance],
    tracked_parent_pids: Option<&[u32]>,
) -> Result<(), String> {
    let is_blackhole = target.blackhole_sync == Some(true) || target.sync_mode.as_deref() == Some("black_hole");

    if is_blackhole {
        if is_parent_antigravity_running_with_tracked(tracked_parent_pids) {
            return Err("Parent Antigravity application is currently running. Please close the parent application before launching a Black Hole tethered instance.".to_string());
        }

        for inst in all_instances {
            if inst.id != target.id && inst.status == "running" {
                if inst.blackhole_sync == Some(true) || inst.sync_mode.as_deref() == Some("black_hole") {
                    return Err(format!(
                        "Instance '{}' is currently running tethered to The Black Hole. Stop it before launching another Black Hole instance.",
                        inst.name
                    ));
                }
            }
        }
    } else if target.sync_mode.as_deref() != Some("solo") {
        let target_group = if let Some(parent) = Path::new(&target.profile_dir).parent() {
            let p_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if p_name.to_lowercase() != "antigravityprofiles" && !p_name.is_empty() {
                p_name.to_string()
            } else {
                "General".to_string()
            }
        } else {
            "General".to_string()
        };

        let target_app_type = target.app_type.as_deref().unwrap_or("antigravity_ide");

        for inst in all_instances {
            if inst.id != target.id && inst.status == "running" {
                let inst_group = if let Some(parent) = Path::new(&inst.profile_dir).parent() {
                    let p_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    if p_name.to_lowercase() != "antigravityprofiles" && !p_name.is_empty() {
                        p_name.to_string()
                    } else {
                        "General".to_string()
                    }
                } else {
                    "General".to_string()
                };

                let inst_app_type = inst.app_type.as_deref().unwrap_or("antigravity_ide");

                if inst_group.eq_ignore_ascii_case(&target_group) && inst_app_type == target_app_type {
                    let type_label = if target_app_type.contains("ide") { "IDE" } else { "Desktop App" };
                    return Err(format!(
                        "Another {} instance ('{}') in Solar System '{}' is currently running. Close it before launching '{}' to preserve Star Brain integrity.",
                        type_label, inst.name, target_group, target.name
                    ));
                }
            }
        }
    }

    Ok(())
}

/// Spawns an Antigravity instance with complete environment isolation.
pub fn launch_antigravity_instance(
    instance: &mut Instance,
    parent_binaries: Option<&crate::models::ParentBinaries>,
) -> Result<(), String> {
    let binary_path = match &instance.binary_path {
        Some(custom) if Path::new(custom).exists() => std::path::PathBuf::from(custom),
        _ => {
            let app_type = instance.app_type.as_deref().unwrap_or("antigravity_ide");
            detect_binary_for_app_type(app_type)
                .or_else(|| {
                    parent_binaries.and_then(|pb| {
                        let path_str = if app_type == "antigravity" {
                            pb.app_path.as_deref()
                        } else {
                            pb.ide_path.as_deref()
                        };
                        path_str.map(std::path::PathBuf::from).filter(|p| p.exists())
                    })
                })
                .ok_or_else(|| "Antigravity binary not found on the system. Please ensure Antigravity IDE or Antigravity is installed, or configure custom executables in Cosmic Systems.".to_string())?
        }
    };

    let profile_path_buf = crate::detector::expand_path_str(&instance.profile_dir);
    let profile_path = profile_path_buf.as_path();
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
        let expanded = crate::detector::expand_path_str(ws);
        let trimmed = expanded.to_string_lossy().trim().to_string();
        if !trimmed.is_empty() {
            cmd.arg(trimmed);
        }
    }

    // Apply user-configured custom CLI flags
    if let Some(ref flags) = instance.custom_flags {
        for flag in flags.split_whitespace() {
            if !flag.is_empty() {
                cmd.arg(flag);
            }
        }
    }

    // Set isolated Windows environment variables so credentials/sessions never collide
    cmd.env("APPDATA", roaming_dir.as_os_str())
       .env("LOCALAPPDATA", local_dir.as_os_str())
       .env("USERPROFILE", profile_path.as_os_str())
       .env("SSH_CONNECTION", "127.0.0.1 1234 127.0.0.1 22")
       .env("BETTERMULTIGRAVITY_INSTANCE_ID", &instance.id)
       .env("BETTERMULTIGRAVITY_PORT", instance.port.to_string());

    // Apply user-configured environment variables
    if let Some(ref env_map) = instance.env_vars {
        for (k, v) in env_map {
            cmd.env(k, v);
        }
    }

    cmd.stdin(std::process::Stdio::null())
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
        let _ = silent_command("taskkill.exe")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .output();
    }

    // Also check if any lingering process uses the profile dir
    let profile_norm = instance.profile_dir.to_lowercase().replace('/', "\\");
    let mut sys = System::new();
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::everything(),
    );

    for (pid, proc) in sys.processes() {
        let cmd: Vec<String> = proc.cmd().iter().map(|s| s.to_string_lossy().to_string()).collect();
        let cmd_str = cmd.join(" ").to_lowercase();
        if cmd_str.contains(&profile_norm) {
            let _ = silent_command("taskkill.exe")
                .args(["/PID", &pid.as_u32().to_string(), "/T", "/F"])
                .output();
        }
    }

    instance.status = "stopped".to_string();
    instance.pid = None;
    instance.last_used = "Just now".to_string();

    Ok(())
}
