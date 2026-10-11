use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

use crate::models::{Account, AntigravityBinaryInfo, CreateInstanceInput, FleetState, Instance, SystemInfo};
use crate::detector::{check_junction_support, detect_antigravity_binary, detect_all_antigravity_binaries, detect_binary_for_app_type, get_base_profiles_dir};
use crate::junction::{remove_junction, setup_profile_directories};
use crate::process::{launch_antigravity_instance, refresh_instances_status, stop_antigravity_instance};
use crate::shortcut::{create_instance_desktop_shortcut, get_shortcut_destination};
use crate::storage::{save_fleet_state, sync_account_stats};
use crate::telemetry::{calculate_storage_saved_mb, scan_profile_telemetry};

pub struct AppState {
    pub fleet: Mutex<FleetState>,
}

impl AppState {
    pub fn new(fleet: FleetState) -> Self {
        Self {
            fleet: Mutex::new(fleet),
        }
    }
}

#[tauri::command]
pub fn get_system_info(state: State<'_, AppState>) -> Result<SystemInfo, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    refresh_instances_status(&mut fleet.instances);
    sync_account_stats(&mut fleet);

    let auth_only_count = fleet.instances.iter().filter(|i| i.mode == "auth-only").count();
    let binary = detect_antigravity_binary().map(|p| p.to_string_lossy().to_string());
    let profiles_dir = get_base_profiles_dir().to_string_lossy().to_string();
    let junction_support = check_junction_support();
    let total_storage_saved_mb = calculate_storage_saved_mb(auth_only_count);

    Ok(SystemInfo {
        detected_binary: binary,
        profiles_dir,
        junction_support,
        total_storage_saved_mb,
    })
}

#[tauri::command]
pub fn list_accounts(state: State<'_, AppState>) -> Result<Vec<Account>, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    refresh_instances_status(&mut fleet.instances);
    sync_account_stats(&mut fleet);
    let _ = save_fleet_state(&fleet);
    Ok(fleet.accounts.clone())
}

#[tauri::command]
pub fn save_account(
    state: State<'_, AppState>,
    account: Option<Account>,
    payload: Option<Account>,
) -> Result<Account, String> {
    let mut item = account.or(payload).ok_or("Account payload is required")?;
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;

    if item.id.is_empty() || item.id == "new" {
        item.id = format!("acc-{}", &Uuid::new_v4().to_string()[..8]);
    }

    if let Some(pos) = fleet.accounts.iter().position(|a| a.id == item.id) {
        fleet.accounts[pos] = item.clone();
    } else {
        fleet.accounts.push(item.clone());
    }

    sync_account_stats(&mut fleet);
    save_fleet_state(&fleet)?;
    Ok(item)
}

#[tauri::command]
pub fn delete_account(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let before_len = fleet.accounts.len();
    fleet.accounts.retain(|a| a.id != id);

    if fleet.accounts.len() != before_len {
        sync_account_stats(&mut fleet);
        save_fleet_state(&fleet)?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn reset_account_cycle(state: State<'_, AppState>, id: String) -> Result<Account, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let account = fleet.accounts.iter_mut().find(|a| a.id == id)
        .ok_or_else(|| format!("Account with id '{}' not found", id))?;

    account.tokens_used_m = 0.0;
    account.daily_spend = 0.0;
    account.rpm_current = 0;
    account.resets_in = "30d 0h".to_string();
    account.status = "active".to_string();

    let updated = account.clone();
    sync_account_stats(&mut fleet);
    save_fleet_state(&fleet)?;
    Ok(updated)
}

#[tauri::command]
pub fn list_instances(state: State<'_, AppState>) -> Result<Vec<Instance>, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    refresh_instances_status(&mut fleet.instances);

    // Update telemetry token metrics if available
    for inst in fleet.instances.iter_mut() {
        if Path::new(&inst.profile_dir).exists() {
            let scanned = scan_profile_telemetry(&inst.profile_dir);
            if scanned != "0.0M tokens" {
                inst.tokens_str = scanned;
            }
        }
    }

    sync_account_stats(&mut fleet);
    let _ = save_fleet_state(&fleet);
    Ok(fleet.instances.clone())
}

#[tauri::command]
pub fn create_instance(
    state: State<'_, AppState>,
    payload: Option<CreateInstanceInput>,
    instance: Option<CreateInstanceInput>,
    name: Option<String>,
    account_id: Option<String>,
    mode: Option<String>,
    port: Option<u16>,
    workspace_path: Option<String>,
    binary_path: Option<String>,
    custom_flags: Option<String>,
    env_vars: Option<std::collections::HashMap<String, String>>,
    app_type: Option<String>,
    create_shortcut: Option<bool>,
) -> Result<Instance, String> {
    let mut input = payload.or(instance).unwrap_or_else(|| CreateInstanceInput {
        name: name.clone().unwrap_or_else(|| "New Instance".to_string()),
        account_id: account_id.clone(),
        mode: mode.clone(),
        port,
        workspace_path: workspace_path.clone(),
        binary_path: binary_path.clone(),
        custom_flags: custom_flags.clone(),
        env_vars: env_vars.clone(),
        app_type: app_type.clone(),
        create_shortcut,
    });

    if input.binary_path.is_none() && binary_path.is_some() {
        input.binary_path = binary_path;
    }
    if input.custom_flags.is_none() && custom_flags.is_some() {
        input.custom_flags = custom_flags;
    }
    if input.env_vars.is_none() && env_vars.is_some() {
        input.env_vars = env_vars;
    }
    if input.app_type.is_none() && app_type.is_some() {
        input.app_type = app_type;
    }
    if input.create_shortcut.is_none() && create_shortcut.is_some() {
        input.create_shortcut = create_shortcut;
    }
    if input.workspace_path.is_none() && workspace_path.is_some() {
        input.workspace_path = workspace_path;
    }

    if input.name.trim().is_empty() {
        return Err("Instance name cannot be empty".to_string());
    }

    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;

    let acc_id = input.account_id
        .filter(|s| !s.trim().is_empty())
        .or_else(|| fleet.accounts.first().map(|a| a.id.clone()))
        .unwrap_or_else(|| "acc-1".to_string());

    let instance_mode = input.mode.unwrap_or_else(|| "auth-only".to_string());
    let clean_folder_name: String = input.name.chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    let folder_name = if clean_folder_name.is_empty() {
        format!("Profile_{}", &Uuid::new_v4().to_string()[..6])
    } else {
        clean_folder_name
    };

    // If user provided a specific workspace/profile directory, use it directly as the profile folder;
    // otherwise default to %USERPROFILE%\AntigravityProfiles\<folder_name>
    let profile_path = match input.workspace_path.as_deref().filter(|s| !s.trim().is_empty()) {
        Some(ws) => PathBuf::from(ws.trim()),
        None => {
            let base_profiles = get_base_profiles_dir();
            base_profiles.join(&folder_name)
        }
    };
    let profile_dir_str = profile_path.to_string_lossy().to_string();

    // Assign port
    let assigned_port = input.port.unwrap_or_else(|| {
        let max_port = fleet.instances.iter().map(|i| i.port).max().unwrap_or(9099);
        max_port + 1
    });

    // Setup profile directory and junctions
    setup_profile_directories(&profile_path, &instance_mode)?;

    let resolved_ws = profile_dir_str.clone();
    let _ = std::fs::create_dir_all(&profile_path);

    let app_type = input.app_type.unwrap_or_else(|| "antigravity_ide".to_string());

    let new_instance = Instance {
        id: format!("inst-{}", &Uuid::new_v4().to_string()[..8]),
        name: input.name,
        account_id: acc_id,
        mode: instance_mode,
        port: assigned_port,
        status: "stopped".to_string(),
        tokens_str: "0.0M tokens".to_string(),
        workspace_path: Some(resolved_ws),
        profile_dir: profile_dir_str,
        pid: None,
        last_used: "Just created".to_string(),
        binary_path: input.binary_path,
        custom_flags: input.custom_flags,
        env_vars: input.env_vars,
        app_type: Some(app_type),
    };

    // Optionally create desktop shortcut automatically if requested
    if input.create_shortcut.unwrap_or(false) {
        let target_bin = match &new_instance.binary_path {
            Some(custom) if Path::new(custom).exists() => PathBuf::from(custom),
            _ => {
                let a_type = new_instance.app_type.as_deref().unwrap_or("antigravity_ide");
                detect_binary_for_app_type(a_type).unwrap_or_else(|| PathBuf::from("antigravity.exe"))
            }
        };
        let _ = create_instance_desktop_shortcut(&new_instance, &target_bin, None);
    }

    fleet.instances.push(new_instance.clone());
    sync_account_stats(&mut fleet);
    save_fleet_state(&fleet)?;

    Ok(new_instance)
}

#[tauri::command]
pub fn update_instance(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    account_id: Option<String>,
    mode: Option<String>,
    workspace_path: Option<String>,
    custom_flags: Option<String>,
    env_vars: Option<std::collections::HashMap<String, String>>,
    app_type: Option<String>,
) -> Result<Instance, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let instance = fleet.instances.iter_mut().find(|i| i.id == id)
        .ok_or_else(|| format!("Instance with id '{}' not found", id))?;

    if let Some(n) = name {
        if !n.trim().is_empty() {
            instance.name = n;
        }
    }
    if let Some(acc) = account_id {
        instance.account_id = acc;
    }
    if let Some(m) = mode {
        instance.mode = m;
    }
    if let Some(ws) = workspace_path {
        instance.workspace_path = Some(ws);
    }
    if let Some(flags) = custom_flags {
        instance.custom_flags = Some(flags);
    }
    if let Some(envs) = env_vars {
        instance.env_vars = Some(envs);
    }
    if let Some(at) = app_type {
        instance.app_type = Some(at);
    }

    // Refresh launch.bat if profile dir exists
    let target_bin = match &instance.binary_path {
        Some(custom) if Path::new(custom).exists() => PathBuf::from(custom),
        _ => {
            let a_type = instance.app_type.as_deref().unwrap_or("antigravity_ide");
            detect_binary_for_app_type(a_type).unwrap_or_else(|| PathBuf::from("antigravity.exe"))
        }
    };
    let _ = create_instance_desktop_shortcut(instance, &target_bin, None);

    let updated = instance.clone();
    sync_account_stats(&mut fleet);
    save_fleet_state(&fleet)?;
    Ok(updated)
}

#[tauri::command]
pub fn launch_instance(state: State<'_, AppState>, id: String) -> Result<Instance, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let instance = fleet.instances.iter_mut().find(|i| i.id == id)
        .ok_or_else(|| format!("Instance with id '{}' not found", id))?;

    launch_antigravity_instance(instance)?;
    let updated = instance.clone();

    sync_account_stats(&mut fleet);
    save_fleet_state(&fleet)?;

    Ok(updated)
}

#[tauri::command]
pub fn stop_instance(state: State<'_, AppState>, id: String) -> Result<Instance, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let instance = fleet.instances.iter_mut().find(|i| i.id == id)
        .ok_or_else(|| format!("Instance with id '{}' not found", id))?;

    stop_antigravity_instance(instance)?;
    let updated = instance.clone();

    sync_account_stats(&mut fleet);
    save_fleet_state(&fleet)?;

    Ok(updated)
}

#[tauri::command]
pub fn delete_instance(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;

    if let Some(pos) = fleet.instances.iter().position(|i| i.id == id) {
        let mut inst = fleet.instances.remove(pos);
        let _ = stop_antigravity_instance(&mut inst);

        // 1. Safely unlink NTFS junction first
        let ext_link = Path::new(&inst.profile_dir).join("extensions");
        let _ = remove_junction(&ext_link);

        // 2. Remove desktop shortcut if exists
        let shortcut_path = get_shortcut_destination(&inst.name, None);
        if shortcut_path.exists() {
            let _ = std::fs::remove_file(&shortcut_path);
        }

        // 3. Delete the profile directory of that instance from the profiles folder
        let profile_path = Path::new(&inst.profile_dir);
        if profile_path.exists() {
            let _ = std::fs::remove_dir_all(profile_path);
            if profile_path.exists() {
                std::thread::sleep(std::time::Duration::from_millis(300));
                let _ = std::fs::remove_dir_all(profile_path);
            }
        }

        sync_account_stats(&mut fleet);
        save_fleet_state(&fleet)?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn create_desktop_shortcut(
    state: State<'_, AppState>,
    id: Option<String>,
    instance_id: Option<String>,
    location: Option<String>,
) -> Result<String, String> {
    let target_id = id.or(instance_id).ok_or("Instance id is required")?;
    let fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let instance = fleet.instances.iter().find(|i| i.id == target_id)
        .ok_or_else(|| format!("Instance with id '{}' not found", target_id))?;

    let binary = match &instance.binary_path {
        Some(custom) if Path::new(custom).exists() => PathBuf::from(custom),
        _ => {
            let a_type = instance.app_type.as_deref().unwrap_or("antigravity_ide");
            detect_binary_for_app_type(a_type).ok_or("Antigravity binary not found to create shortcut")?
        }
    };

    let destination = create_instance_desktop_shortcut(instance, &binary, location.as_deref())?;

    Ok(destination.to_string_lossy().to_string())
}

#[tauri::command]
pub fn window_minimize(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_toggle_maximize(window: tauri::Window) -> Result<(), String> {
    if let Ok(is_max) = window.is_maximized() {
        if is_max {
            window.unmaximize().map_err(|e| e.to_string())
        } else {
            window.maximize().map_err(|e| e.to_string())
        }
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn window_close(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_start_drag(window: tauri::Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_available_binaries() -> Result<Vec<AntigravityBinaryInfo>, String> {
    Ok(detect_all_antigravity_binaries())
}

#[tauri::command]
pub fn pick_folder() -> Result<Option<String>, String> {
    let folder = rfd::FileDialog::new()
        .set_title("Select Workspace Directory")
        .pick_folder();
    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub fn pick_file() -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .set_title("Select Workspace File or Project")
        .pick_file();
    Ok(file.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub fn open_in_explorer(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if p.exists() {
        let _ = std::process::Command::new("explorer.exe")
            .arg(&path)
            .spawn();
    }
    Ok(())
}

