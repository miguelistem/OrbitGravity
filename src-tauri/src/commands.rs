use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

use crate::models::{Account, AntigravityBinaryInfo, CreateInstanceInput, FleetState, Instance, SystemInfo, ParentBinaries};
use crate::detector::{check_junction_support, detect_antigravity_binary, detect_all_antigravity_binaries, detect_binary_for_app_type, get_base_profiles_dir};
use crate::junction::{remove_junction, setup_profile_directories};
use crate::process::{launch_antigravity_instance, refresh_instances_status, stop_antigravity_instance};
use crate::shortcut::{create_instance_desktop_shortcut, get_shortcut_destination};
use crate::storage::{save_fleet_state, sync_account_stats};
use crate::telemetry::{calculate_storage_saved_mb, scan_profile_telemetry};

pub struct AppState {
    pub fleet: Mutex<FleetState>,
    pub active_parent_pids: Mutex<std::collections::HashSet<u32>>,
}

impl AppState {
    pub fn new(fleet: FleetState) -> Self {
        Self {
            fleet: Mutex::new(fleet),
            active_parent_pids: Mutex::new(std::collections::HashSet::new()),
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
    tag: Option<String>,
    account_id: Option<String>,
    mode: Option<String>,
    port: Option<u16>,
    workspace_path: Option<String>,
    binary_path: Option<String>,
    custom_flags: Option<String>,
    env_vars: Option<std::collections::HashMap<String, String>>,
    app_type: Option<String>,
    create_shortcut: Option<bool>,
    sync_mode: Option<String>,
) -> Result<Instance, String> {
    let mut input = payload.or(instance).unwrap_or_else(|| CreateInstanceInput {
        name: name.clone().unwrap_or_else(|| "New Instance".to_string()),
        tag: tag.clone(),
        account_id: account_id.clone(),
        mode: mode.clone(),
        port,
        workspace_path: workspace_path.clone(),
        binary_path: binary_path.clone(),
        custom_flags: custom_flags.clone(),
        env_vars: env_vars.clone(),
        app_type: app_type.clone(),
        create_shortcut,
        blackhole_sync: None,
        sync_mode: sync_mode.clone(),
        tier: None,
    });

    if input.tag.is_none() && tag.is_some() {
        input.tag = tag;
    }

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
    if input.sync_mode.is_none() && sync_mode.is_some() {
        input.sync_mode = sync_mode;
    }

    let trimmed_name = input.name.trim();
    if trimmed_name.is_empty() {
        return Err("Instance name cannot be empty".to_string());
    }

    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;

    if fleet.instances.iter().any(|i| i.name.trim().eq_ignore_ascii_case(trimmed_name)) {
        return Err(format!("An instance with the name '{}' already exists. Please choose a unique name.", trimmed_name));
    }

    let effective_sync_mode = input.sync_mode.clone().unwrap_or_else(|| {
        if input.blackhole_sync == Some(true) {
            "black_hole".to_string()
        } else {
            "solar_system".to_string()
        }
    });

    let effective_tag = input.tag.as_deref().unwrap_or("Projects").trim();

    if effective_sync_mode == "solo" {
        // Solo system orbits MUST have a unique group name and CANNOT join an existing group.
        if fleet.instances.iter().any(|i| {
            let existing_tag = i.tag.as_deref().unwrap_or("Projects").trim();
            existing_tag.eq_ignore_ascii_case(effective_tag)
        }) {
            return Err(format!(
                "Solo system orbits cannot join existing group '{}'. A solo system requires a unique group name.",
                effective_tag
            ));
        }
    } else if effective_sync_mode == "solar_system" {
        // A solar system orbit cannot join a group that already contains a solo rogue planet!
        if fleet.instances.iter().any(|i| {
            let is_solo = i.sync_mode.as_deref() == Some("solo");
            let existing_tag = i.tag.as_deref().unwrap_or("Projects").trim();
            is_solo && existing_tag.eq_ignore_ascii_case(effective_tag)
        }) {
            return Err(format!(
                "Group '{}' is an isolated Solo System (Rogue Planet) and cannot be joined by other instances.",
                effective_tag
            ));
        }
    }

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
        Some(ws) => crate::detector::expand_path_str(ws),
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
        tag: input.tag,
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
        blackhole_sync: input.blackhole_sync,
        sync_mode: input.sync_mode.or_else(|| {
            if input.blackhole_sync == Some(true) {
                Some("black_hole".to_string())
            } else {
                Some("solar_system".to_string())
            }
        }),
        tier: input.tier.or(Some("Pro".to_string())),
    };

    // Spawn shortcut creation in background thread so GUI never freezes
    if input.create_shortcut.unwrap_or(false) {
        let target_bin = match &new_instance.binary_path {
            Some(custom) if Path::new(custom).exists() => PathBuf::from(custom),
            _ => {
                let a_type = new_instance.app_type.as_deref().unwrap_or("antigravity_ide");
                detect_binary_for_app_type(a_type).unwrap_or_else(|| PathBuf::from("antigravity.exe"))
            }
        };
        let inst_clone = new_instance.clone();
        std::thread::spawn(move || {
            let _ = create_instance_desktop_shortcut(&inst_clone, &target_bin, None);
        });
    }

    fleet.instances.push(new_instance.clone());
    sync_account_stats(&mut fleet);
    save_fleet_state(&fleet)?;

    // Spawn convergence synchronization in background thread so create_instance returns instantaneously (<15ms)
    let fleet_instances = fleet.instances.clone();
    let inst_clone = new_instance.clone();
    std::thread::spawn(move || {
        let _ = crate::conversations::sync_instance_on_session_start(&inst_clone);
        let _ = crate::conversations::sync_all_shared_brains(&fleet_instances);
    });

    Ok(new_instance)
}

#[tauri::command]
pub fn update_instance(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    tag: Option<String>,
    account_id: Option<String>,
    mode: Option<String>,
    workspace_path: Option<String>,
    custom_flags: Option<String>,
    env_vars: Option<std::collections::HashMap<String, String>>,
    app_type: Option<String>,
    blackhole_sync: Option<bool>,
    sync_mode: Option<String>,
    tier: Option<String>,
) -> Result<Instance, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    if let Some(ref n) = name {
        let trimmed_new = n.trim();
        if trimmed_new.is_empty() {
            return Err("Instance name cannot be empty".to_string());
        }
        if fleet.instances.iter().any(|i| i.id != id && i.name.trim().eq_ignore_ascii_case(trimmed_new)) {
            return Err(format!("An instance with the name '{}' already exists. Please choose a unique name.", trimmed_new));
        }
    }

    let (current_tag, current_sync_mode) = {
        let current_inst = fleet.instances.iter().find(|i| i.id == id)
            .ok_or_else(|| format!("Instance with id '{}' not found", id))?;
        (
            current_inst.tag.clone().unwrap_or_else(|| "Projects".to_string()),
            current_inst.sync_mode.clone().unwrap_or_else(|| "solar_system".to_string()),
        )
    };

    let target_tag = tag.as_deref().unwrap_or(&current_tag).trim();
    let target_sync_mode = sync_mode.as_deref().unwrap_or(&current_sync_mode);

    if target_sync_mode == "solo" {
        // Solo system orbits cannot share a group with ANY OTHER instance (i.id != id)
        if fleet.instances.iter().any(|i| {
            i.id != id && i.tag.as_deref().unwrap_or("Projects").trim().eq_ignore_ascii_case(target_tag)
        }) {
            return Err(format!(
                "Solo system orbits cannot join existing group '{}'. A solo system requires a unique group name.",
                target_tag
            ));
        }
    } else if target_sync_mode == "solar_system" {
        // A solar system orbit cannot join a group that belongs to another solo rogue planet
        if fleet.instances.iter().any(|i| {
            i.id != id
                && i.sync_mode.as_deref() == Some("solo")
                && i.tag.as_deref().unwrap_or("Projects").trim().eq_ignore_ascii_case(target_tag)
        }) {
            return Err(format!(
                "Group '{}' is an isolated Solo System (Rogue Planet) and cannot be joined by other instances.",
                target_tag
            ));
        }
    }

    let instance = fleet.instances.iter_mut().find(|i| i.id == id)
        .ok_or_else(|| format!("Instance with id '{}' not found", id))?;

    if let Some(n) = name {
        if !n.trim().is_empty() {
            instance.name = n;
        }
    }
    if let Some(t) = tag {
        instance.tag = Some(t);
    }
    if let Some(acc) = account_id {
        instance.account_id = acc;
    }
    if let Some(m) = mode {
        instance.mode = m;
    }
    if let Some(ws) = workspace_path {
        let expanded = crate::detector::expand_path_str(&ws);
        instance.workspace_path = Some(expanded.to_string_lossy().to_string());
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
    if let Some(tr) = tier {
        instance.tier = Some(tr);
    }
    if let Some(sm) = sync_mode {
        if sm == "black_hole" {
            instance.blackhole_sync = Some(true);
        } else {
            instance.blackhole_sync = Some(false);
        }
        instance.sync_mode = Some(sm);
    } else if let Some(bhs) = blackhole_sync {
        instance.blackhole_sync = Some(bhs);
        if bhs {
            instance.sync_mode = Some("black_hole".to_string());
        }
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

    let fleet_instances = fleet.instances.clone();
    std::thread::spawn(move || {
        let _ = crate::conversations::sync_all_shared_brains(&fleet_instances);
    });

    Ok(updated)
}

#[tauri::command]
pub fn launch_instance(state: State<'_, AppState>, id: String) -> Result<Instance, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    refresh_instances_status(&mut fleet.instances);

    let instance_clone = fleet.instances.iter().find(|i| i.id == id)
        .ok_or_else(|| format!("Instance with id '{}' not found", id))?
        .clone();

    // Check mutual exclusion concurrency guard
    let tracked_pids = state.active_parent_pids.lock().ok()
        .map(|p| p.iter().cloned().collect::<Vec<_>>())
        .unwrap_or_default();
    crate::process::check_launch_concurrency_guard_with_tracked(&instance_clone, &fleet.instances, Some(&tracked_pids))?;

    // Perform pre-flight pull synchronization
    let _ = crate::conversations::sync_instance_on_session_start(&instance_clone);

    let parent_bins = fleet.parent_binaries.clone();
    let instance = fleet.instances.iter_mut().find(|i| i.id == id).unwrap();
    launch_antigravity_instance(instance, parent_bins.as_ref())?;
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
    let _ = crate::conversations::sync_instance_on_session_stop(instance);
    let updated = instance.clone();

    sync_account_stats(&mut fleet);
    save_fleet_state(&fleet)?;

    Ok(updated)
}

#[tauri::command]
pub fn sync_instance_brain(state: State<'_, AppState>, id: String) -> Result<String, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    refresh_instances_status(&mut fleet.instances);

    let instance = fleet.instances.iter().find(|i| i.id == id)
        .ok_or_else(|| format!("Instance with id '{}' not found", id))?
        .clone();

    let is_bh = instance.blackhole_sync == Some(true) || instance.sync_mode.as_deref() == Some("black_hole");
    let is_solo = instance.sync_mode.as_deref() == Some("solo");

    if is_bh {
        let tracked_pids = state.active_parent_pids.lock().ok()
            .map(|p| p.iter().cloned().collect::<Vec<_>>())
            .unwrap_or_default();
        if instance.status == "running" && crate::process::is_parent_antigravity_running_with_tracked(Some(&tracked_pids)) {
            return Err("Cannot synchronize: Concurrency conflict detected (both instance and parent app are active).".to_string());
        }
        let report = crate::conversations::sync_black_hole_fleet(&fleet.instances)?;
        sync_account_stats(&mut fleet);
        save_fleet_state(&fleet)?;
        Ok(report)
    } else if !is_solo {
        let mut group = "General".to_string();
        if let Some(parent) = Path::new(&instance.profile_dir).parent() {
            let p_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if p_name.to_lowercase() != "antigravityprofiles" && !p_name.is_empty() {
                group = p_name.to_string();
            }
        }

        let report = crate::conversations::sync_solar_system_fleet(&group, &fleet.instances)?;
        sync_account_stats(&mut fleet);
        save_fleet_state(&fleet)?;
        Ok(report)
    } else {
        let res = crate::conversations::sync_instance_with_master_brain(&instance)?;
        sync_account_stats(&mut fleet);
        save_fleet_state(&fleet)?;
        Ok(res)
    }
}

#[tauri::command]
pub fn sync_instance_conversations(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let instance = fleet.instances.iter().find(|i| i.id == id)
        .ok_or_else(|| format!("Instance with id '{}' not found", id))?;

    crate::conversations::sync_instance_on_session_start(instance)?;
    Ok(true)
}

#[tauri::command]
pub fn delete_instance(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;

    if let Some(pos) = fleet.instances.iter().position(|i| i.id == id) {
        let mut inst = fleet.instances.remove(pos);
        let _ = stop_antigravity_instance(&mut inst);

        // 1. Safely unlink NTFS junctions first
        let p_path = Path::new(&inst.profile_dir);
        let _ = remove_junction(&p_path.join("extensions"));
        let _ = remove_junction(&p_path.join("Desktop"));
        let _ = remove_junction(&p_path.join("Documents"));
        let _ = remove_junction(&p_path.join("Downloads"));
        let _ = remove_junction(&p_path.join(".gemini").join("config"));

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
        let _ = crate::conversations::sync_all_shared_brains(&fleet.instances);
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
    let p = crate::detector::expand_path_str(&path);
    if p.exists() {
        let _ = std::process::Command::new("explorer.exe")
            .arg(p.to_string_lossy().to_string())
            .spawn();
    }
    Ok(())
}

#[tauri::command]
pub fn enable_protocol_dispatcher() -> Result<bool, String> {
    crate::dispatcher::enable_dispatcher()
}

#[tauri::command]
pub fn restore_original_protocols() -> Result<bool, String> {
    crate::dispatcher::restore_original_protocols()
}

#[tauri::command]
pub fn get_protocol_dispatcher_status() -> Result<bool, String> {
    Ok(crate::dispatcher::is_dispatcher_active())
}

#[tauri::command]
pub fn set_active_auth_instance(id: String) -> Result<bool, String> {
    crate::dispatcher::set_active_target_id(&id)?;
    Ok(true)
}

#[tauri::command]
pub fn dispatch_url_to_instance(state: State<'_, AppState>, id: String, url: String) -> Result<bool, String> {
    let fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let instance = fleet.instances.iter().find(|i| i.id == id)
        .ok_or_else(|| format!("Instance with id '{}' not found", id))?;

    let app_type = instance.app_type.as_deref().unwrap_or("antigravity_ide");
    crate::dispatcher::route_url_to_instance(
        &instance.profile_dir,
        app_type,
        instance.binary_path.as_deref(),
        &url,
    )?;
    Ok(true)
}

#[tauri::command]
pub fn list_conversations(
    profile_dir: Option<String>,
    app_type: Option<String>,
    is_global: bool,
    source_name: Option<String>,
) -> Result<Vec<crate::conversations::ConversationInfo>, String> {
    let atype = app_type.unwrap_or_else(|| "antigravity_ide".to_string());
    let sname = source_name.unwrap_or_else(|| if is_global { "Main Antigravity".to_string() } else { "Profile".to_string() });
    Ok(crate::conversations::list_conversations_for_source(
        profile_dir.as_deref(),
        &atype,
        is_global,
        &sname,
    ))
}

#[tauri::command]
pub fn import_conversations(
    state: State<'_, AppState>,
    target_instance_id: String,
    source_profile_dir: Option<String>,
    source_app_type: Option<String>,
    is_global: bool,
    conversation_ids: Vec<String>,
) -> Result<usize, String> {
    let fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let target = fleet.instances.iter().find(|i| i.id == target_instance_id)
        .ok_or_else(|| format!("Target instance '{}' not found", target_instance_id))?;

    let dest_atype = target.app_type.as_deref().unwrap_or("antigravity_ide");
    let src_atype = source_app_type.unwrap_or_else(|| "antigravity_ide".to_string());

    let ids_to_import: Vec<String> = if conversation_ids.is_empty() {
        crate::conversations::list_conversations_for_source(
            source_profile_dir.as_deref(),
            &src_atype,
            is_global,
            "Source",
        ).into_iter().map(|c| c.id).collect()
    } else {
        conversation_ids
    };

    let mut imported = 0;
    for cid in &ids_to_import {
        if crate::conversations::copy_conversation_to_target(
            source_profile_dir.as_deref(),
            &src_atype,
            is_global,
            &target.profile_dir,
            dest_atype,
            cid,
        ).is_ok() {
            imported += 1;
        }
    }

    Ok(imported)
}

#[tauri::command]
pub fn transfer_conversation(
    state: State<'_, AppState>,
    from_instance_id: String,
    to_instance_id: String,
    conversation_id: String,
) -> Result<bool, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    refresh_instances_status(&mut fleet.instances);

    let src = fleet.instances.iter().find(|i| i.id == from_instance_id)
        .ok_or_else(|| format!("Source instance '{}' not found", from_instance_id))?
        .clone();
    let dest = fleet.instances.iter().find(|i| i.id == to_instance_id)
        .ok_or_else(|| format!("Destination instance '{}' not found", to_instance_id))?
        .clone();

    // 1. Destination instance must NOT be running
    if dest.status == "running" {
        return Err(format!(
            "Cannot transfer conversation: destination instance '{}' is currently running. Please terminate/stop it before transferring.",
            dest.name
        ));
    }

    // 2. If destination is part of a brain, all instances in that brain must be terminated
    let is_dest_bh = dest.blackhole_sync == Some(true) || dest.sync_mode.as_deref() == Some("black_hole");
    let is_dest_solo = dest.sync_mode.as_deref() == Some("solo");

    if is_dest_bh {
        // Black Hole mutual exclusion: neither parent app nor any Black Hole instance can be running
        let tracked_pids = state.active_parent_pids.lock().ok()
            .map(|p| p.iter().cloned().collect::<Vec<_>>())
            .unwrap_or_default();
        if crate::process::is_parent_antigravity_running_with_tracked(Some(&tracked_pids)) {
            return Err("Cannot transfer conversation: Parent Antigravity application is currently running. Please terminate/close the parent application before transferring to a Black Hole tethered instance.".to_string());
        }

        for inst in &fleet.instances {
            if inst.status == "running" && (inst.blackhole_sync == Some(true) || inst.sync_mode.as_deref() == Some("black_hole")) {
                return Err(format!(
                    "Cannot transfer conversation: Black Hole tethered instance '{}' is currently running. Please stop it first.",
                    inst.name
                ));
            }
        }
    } else if !is_dest_solo {
        // Solar System brain: Check all members in destination's group
        let dest_group = crate::conversations::get_instance_solar_group(&dest);

        let mut running_members = Vec::new();
        for inst in &fleet.instances {
            let is_bh = inst.blackhole_sync == Some(true) || inst.sync_mode.as_deref() == Some("black_hole");
            let is_solo = inst.sync_mode.as_deref() == Some("solo");
            if is_bh || is_solo { continue; }

            let g = crate::conversations::get_instance_solar_group(inst);

            if g.eq_ignore_ascii_case(&dest_group) && inst.status == "running" {
                running_members.push(inst.name.clone());
            }
        }

        if !running_members.is_empty() {
            return Err(format!(
                "Cannot transfer conversation: instance(s) [{}] in destination Solar System '{}' are currently running. All instances in the destination brain must be terminated before transferring.",
                running_members.join(", "),
                dest_group
            ));
        }
    }

    // 3. Copy conversation files & layout
    let src_atype = src.app_type.as_deref().unwrap_or("antigravity_ide");
    let dest_atype = dest.app_type.as_deref().unwrap_or("antigravity_ide");

    crate::conversations::copy_conversation_to_target(
        Some(&src.profile_dir),
        src_atype,
        false,
        &dest.profile_dir,
        dest_atype,
        &conversation_id,
    )?;

    // 4. Automatically synchronize to the entire brain and all its instances
    if is_dest_bh {
        let _ = crate::conversations::sync_black_hole_fleet(&fleet.instances);
    } else if !is_dest_solo {
        let dest_group = crate::conversations::get_instance_solar_group(&dest);
        let _ = crate::conversations::sync_solar_system_fleet(&dest_group, &fleet.instances);
    }

    sync_account_stats(&mut fleet);
    save_fleet_state(&fleet)?;

    Ok(true)
}

#[tauri::command]
pub fn get_shared_brain_status(state: State<'_, AppState>, id: String) -> Result<crate::conversations::SharedBrainStatus, String> {
    let fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let inst = fleet.instances.iter().find(|i| i.id == id)
        .ok_or_else(|| format!("Instance '{}' not found", id))?;

    Ok(crate::conversations::get_instance_shared_brain_status(inst, &fleet.instances))
}

#[tauri::command]
pub fn sync_all_shared_brains(state: State<'_, AppState>) -> Result<bool, String> {
    let fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    crate::conversations::sync_all_shared_brains(&fleet.instances)?;
    Ok(true)
}

#[tauri::command]
pub fn get_parent_binaries(state: State<'_, AppState>) -> Result<ParentBinaries, String> {
    let fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    Ok(fleet.parent_binaries.clone().unwrap_or_default())
}

#[tauri::command]
pub fn set_parent_binaries(
    state: State<'_, AppState>,
    app_path: Option<String>,
    ide_path: Option<String>,
) -> Result<ParentBinaries, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let updated = ParentBinaries {
        app_path: app_path.filter(|s| !s.trim().is_empty()),
        ide_path: ide_path.filter(|s| !s.trim().is_empty()),
        custom_configured: true,
    };
    fleet.parent_binaries = Some(updated.clone());
    save_fleet_state(&fleet)?;
    Ok(updated)
}

#[tauri::command]
pub fn pick_executable_file(title: Option<String>) -> Result<Option<String>, String> {
    let t = title.unwrap_or_else(|| "Select Antigravity Executable (.exe)".to_string());
    let file = rfd::FileDialog::new()
        .set_title(&t)
        .add_filter("Windows Executable (*.exe)", &["exe"])
        .pick_file();
    Ok(file.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub fn launch_parent_app(state: State<'_, AppState>, variant: String) -> Result<u32, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    refresh_instances_status(&mut fleet.instances);

    // Mutual exclusion: Prevent parent app launch if any Black Hole tethered instance is running
    for inst in &fleet.instances {
        if inst.status == "running" && (inst.blackhole_sync == Some(true) || inst.sync_mode.as_deref() == Some("black_hole")) {
            return Err(format!(
                "Cannot launch parent Antigravity application while Black Hole tethered instance '{}' is running. Please close the tethered instance first.",
                inst.name
            ));
        }
    }

    let (app_path, ide_path) = match &fleet.parent_binaries {
        Some(pb) => (pb.app_path.clone(), pb.ide_path.clone()),
        None => (None, None),
    };

    let target_bin = if variant.to_lowercase().contains("ide") {
        ide_path.or_else(|| crate::detector::detect_binary_for_app_type("ide").map(|p| p.to_string_lossy().to_string()))
    } else {
        app_path.or_else(|| crate::detector::detect_binary_for_app_type("app").map(|p| p.to_string_lossy().to_string()))
    }.ok_or_else(|| "Executable path not configured or detected.".to_string())?;

    if !std::path::Path::new(&target_bin).exists() {
        return Err(format!("Binary file does not exist at '{}'", target_bin));
    }

    let mut cmd = std::process::Command::new(&target_bin);
    cmd.arg("--new-window");
    cmd.stdin(std::process::Stdio::null())
       .stdout(std::process::Stdio::null())
       .stderr(std::process::Stdio::null());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
        cmd.creation_flags(DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP);
    }

    let child = cmd.spawn()
        .map_err(|e| format!("Failed to launch parent application: {}", e))?;

    let pid = child.id();
    if let Ok(mut parent_pids) = state.active_parent_pids.lock() {
        parent_pids.insert(pid);
    }

    Ok(pid)
}

#[tauri::command]
pub fn attach_instance_to_blackhole(state: State<'_, AppState>, instance_id: String) -> Result<bool, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let instance = fleet.instances.iter_mut().find(|i| i.id == instance_id)
        .ok_or_else(|| format!("Instance '{}' not found", instance_id))?;

    instance.blackhole_sync = Some(true);
    let clone_inst = instance.clone();
    crate::conversations::attach_instance_to_blackhole(&clone_inst)
        .map_err(|e| format!("Failed to attach to Black Hole: {}", e))?;

    save_fleet_state(&fleet)?;
    let _ = crate::conversations::sync_all_shared_brains(&fleet.instances);
    Ok(true)
}

#[tauri::command]
pub fn detach_instance_from_blackhole(state: State<'_, AppState>, instance_id: String) -> Result<bool, String> {
    let mut fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let instance = fleet.instances.iter_mut().find(|i| i.id == instance_id)
        .ok_or_else(|| format!("Instance '{}' not found", instance_id))?;

    instance.blackhole_sync = Some(false);
    let clone_inst = instance.clone();
    crate::conversations::detach_instance_from_blackhole(&clone_inst)
        .map_err(|e| format!("Failed to detach from Black Hole: {}", e))?;

    save_fleet_state(&fleet)?;
    let _ = crate::conversations::sync_all_shared_brains(&fleet.instances);
    Ok(true)
}

#[tauri::command]
pub fn get_cosmic_systems_overview(state: State<'_, AppState>) -> Result<crate::models::CosmicOverview, String> {
    let fleet = state.fleet.lock().map_err(|e| e.to_string())?;

    let (app_path, ide_path) = match &fleet.parent_binaries {
        Some(pb) => (pb.app_path.clone(), pb.ide_path.clone()),
        None => (None, None),
    };

    let resolved_app = app_path.or_else(|| {
        crate::detector::detect_binary_for_app_type("app").map(|p| p.to_string_lossy().to_string())
    });
    let resolved_ide = ide_path.or_else(|| {
        crate::detector::detect_binary_for_app_type("ide").map(|p| p.to_string_lossy().to_string())
    });

    let app_valid = resolved_app.as_ref().map(|p| std::path::Path::new(p).exists()).unwrap_or(false);
    let ide_valid = resolved_ide.as_ref().map(|p| std::path::Path::new(p).exists()).unwrap_or(false);

    let global_convs = crate::conversations::list_conversations_for_source(None, "antigravity", true, "Black Hole");
    let global_total = global_convs.len();

    let tracked_pids = state.active_parent_pids.lock().ok()
        .map(|p| p.iter().cloned().collect::<Vec<_>>())
        .unwrap_or_default();
    let parent_info = crate::process::get_parent_process_info_with_tracked(Some(&tracked_pids));

    let mut tethered_planets: Vec<Instance> = Vec::new();
    let mut systems_map: std::collections::HashMap<String, Vec<Instance>> = std::collections::HashMap::new();
    let mut rogue_planets: Vec<Instance> = Vec::new();

    for inst in &fleet.instances {
        if inst.blackhole_sync == Some(true) || inst.sync_mode.as_deref() == Some("black_hole") {
            tethered_planets.push(inst.clone());
            continue;
        }

        if inst.sync_mode.as_deref() == Some("solo") {
            rogue_planets.push(inst.clone());
            continue;
        }

        let group_key = crate::conversations::get_instance_solar_group(inst);
        systems_map.entry(group_key).or_default().push(inst.clone());
    }

    let black_hole = crate::models::BlackHoleInfo {
        name: "The Black Hole (Parent Singularity)".to_string(),
        app_path: resolved_app,
        ide_path: resolved_ide,
        app_valid,
        ide_valid,
        app_running: parent_info.app_running,
        ide_running: parent_info.ide_running,
        global_conversations_count: global_total,
        global_brain_path: dirs::home_dir().map(|h| h.join(".gemini").to_string_lossy().to_string()).unwrap_or_else(|| "%USERPROFILE%\\.gemini".to_string()),
        tethered_planets,
    };

    let mut solar_systems: Vec<crate::models::SolarSystemInfo> = Vec::new();
    for (group_name, instances) in systems_map {
        let slug: String = group_name.chars().filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_').collect();
        let star_path = crate::conversations::get_shared_brains_base_dir().join(&slug).to_string_lossy().to_string();

        let mut seen_convs = std::collections::HashSet::new();
        let mut total_convs = 0;

        // Check shared star brain if it exists on disk
        if std::path::Path::new(&star_path).exists() {
            let star_convs = crate::conversations::list_conversations_for_source(
                Some(&star_path),
                "antigravity_ide",
                false,
                &group_name,
            );
            for c in star_convs {
                if seen_convs.insert(c.id) {
                    total_convs += 1;
                }
            }
        }

        // Count conversations from all planet member instances in this system
        for inst in &instances {
            let inst_convs = crate::conversations::list_conversations_for_source(
                Some(&inst.profile_dir),
                inst.app_type.as_deref().unwrap_or("antigravity_ide"),
                false,
                &inst.name,
            );
            for c in inst_convs {
                if seen_convs.insert(c.id) {
                    total_convs += 1;
                }
            }
        }

        solar_systems.push(crate::models::SolarSystemInfo {
            name: group_name,
            star_brain_path: star_path,
            is_shared: instances.len() >= 2,
            total_conversations: total_convs,
            planets: instances,
        });
    }

    solar_systems.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(crate::models::CosmicOverview {
        black_hole,
        solar_systems,
        rogue_planets,
    })
}

#[tauri::command]
pub fn get_parent_process_status(state: State<'_, AppState>) -> Result<crate::process::ParentProcessInfo, String> {
    let tracked_pids = state.active_parent_pids.lock().ok()
        .map(|p| p.iter().cloned().collect::<Vec<_>>())
        .unwrap_or_default();
    Ok(crate::process::get_parent_process_info_with_tracked(Some(&tracked_pids)))
}

#[tauri::command]
pub fn terminate_parent_app(state: State<'_, AppState>, variant: Option<String>) -> Result<usize, String> {
    let tracked_pids = state.active_parent_pids.lock().ok()
        .map(|p| p.iter().cloned().collect::<Vec<_>>())
        .unwrap_or_default();
    let count = crate::process::terminate_parent_antigravity_with_tracked(variant.as_deref(), Some(&tracked_pids))?;
    if let Ok(mut active) = state.active_parent_pids.lock() {
        active.clear();
    }
    Ok(count)
}

#[tauri::command]
pub fn delete_conversation(
    state: State<'_, AppState>,
    profile_dir: Option<String>,
    app_type: Option<String>,
    is_global: Option<bool>,
    conversation_id: String,
    delete_from_shared_brain: Option<bool>,
) -> Result<bool, String> {
    let is_glob = is_global.unwrap_or(false);
    let del_shared = delete_from_shared_brain.unwrap_or(false);
    let res = crate::conversations::delete_conversation_record(
        profile_dir.as_deref(),
        app_type.as_deref(),
        is_glob,
        &conversation_id,
        del_shared,
    )?;

    if let Ok(mut fleet) = state.fleet.lock() {
        sync_account_stats(&mut fleet);
        let _ = save_fleet_state(&fleet);
    }

    Ok(res)
}

#[tauri::command]
pub fn get_all_antigravity_quotas(state: State<'_, AppState>) -> Result<Vec<crate::quota::InstanceQuotaResult>, String> {
    let fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    Ok(crate::quota::fetch_all_antigravity_app_quotas(&fleet.instances))
}

#[tauri::command]
pub fn get_instance_quota_summary(state: State<'_, AppState>, id: String) -> Result<crate::quota::InstanceQuotaResult, String> {
    let fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let instance = fleet.instances.iter().find(|i| i.id == id)
        .ok_or_else(|| format!("Instance with id '{}' not found", id))?;
    Ok(crate::quota::fetch_instance_quota(instance))
}

#[tauri::command]
pub fn get_conversation_transcript(
    conversation_id: String,
    profile_dir: Option<String>,
    is_global: bool,
    app_type: Option<String>,
) -> Result<Vec<crate::conversations::TranscriptStep>, String> {
    Ok(crate::conversations::read_conversation_transcript(
        &conversation_id,
        profile_dir.as_deref(),
        is_global,
        app_type.as_deref().unwrap_or("antigravity_ide"),
    ))
}

#[tauri::command]
pub fn list_available_groups(state: State<'_, AppState>) -> Result<Vec<crate::models::AvailableGroup>, String> {
    let fleet = state.fleet.lock().map_err(|e| e.to_string())?;
    let mut map: std::collections::BTreeMap<String, Vec<String>> = std::collections::BTreeMap::new();

    // Collect all rogue/solo groups (any group holding an instance with sync_mode == "solo")
    let mut rogue_groups = std::collections::HashSet::new();
    for inst in &fleet.instances {
        if inst.sync_mode.as_deref() == Some("solo") {
            let g = crate::conversations::get_instance_solar_group(inst);
            if !g.is_empty() {
                rogue_groups.insert(g.to_lowercase());
            }
        }
    }

    // 1. Gather all groups currently assigned to solar system instances
    for inst in &fleet.instances {
        if inst.sync_mode.as_deref() == Some("solo")
            || inst.sync_mode.as_deref() == Some("black_hole")
            || inst.blackhole_sync == Some(true)
        {
            continue;
        }

        let g = crate::conversations::get_instance_solar_group(inst);
        if !g.is_empty() && g != "General Workspaces" && !rogue_groups.contains(&g.to_lowercase()) {
            map.entry(g).or_default().push(inst.name.clone());
        }
    }

    // 2. Discover shared brains directories on disk (%USERPROFILE%\AntigravityProfiles\_shared_brains)
    let shared_base = crate::conversations::get_shared_brains_base_dir();
    if let Ok(entries) = std::fs::read_dir(&shared_base) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                let folder_name = entry.file_name().to_string_lossy().to_string();
                if !folder_name.starts_with("Group_")
                    && !folder_name.is_empty()
                    && folder_name != "General"
                    && folder_name != "General Workspaces"
                    && !rogue_groups.contains(&folder_name.to_lowercase())
                {
                    map.entry(folder_name).or_default();
                }
            }
        }
    }

    // 3. Ensure standard "Projects" exists as fallback if not a rogue group
    if map.is_empty() && !rogue_groups.contains("projects") {
        map.entry("Projects".to_string()).or_default();
    }

    let mut result: Vec<crate::models::AvailableGroup> = map
        .into_iter()
        .map(|(name, instances)| {
            let slug: String = name.chars().filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_').collect();
            let brain_path = shared_base.join(&slug);
            let has_shared_brain = brain_path.exists();
            let count = instances.len();
            crate::models::AvailableGroup {
                name,
                instance_count: count,
                instances,
                has_shared_brain,
            }
        })
        .collect();

    // Sort by instance_count descending, then alphabetical name
    result.sort_by(|a, b| b.instance_count.cmp(&a.instance_count).then_with(|| a.name.cmp(&b.name)));
    Ok(result)
}



