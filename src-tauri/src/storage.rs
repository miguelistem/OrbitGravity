use std::path::PathBuf;
use crate::models::{Account, FleetState, Instance};
use crate::detector::get_base_profiles_dir;

/// Resolves the file path for fleet state persistence.
pub fn get_storage_path() -> PathBuf {
    let base_dir = if let Some(local_app_data) = dirs::data_local_dir() {
        local_app_data.join("BetterMultigravity")
    } else if let Some(home) = dirs::home_dir() {
        home.join("AppData").join("Local").join("BetterMultigravity")
    } else {
        PathBuf::from(r"C:\BetterMultigravity")
    };

    let _ = std::fs::create_dir_all(&base_dir);
    base_dir.join("fleet_state.json")
}

/// Generates default seed data matching the mockup.
pub fn get_seed_data() -> FleetState {
    let profiles_base = get_base_profiles_dir();

    let accounts = vec![
        Account {
            id: "acc-1".to_string(),
            name: "Primary Pro Account".to_string(),
            email: "dev.primary@company.io".to_string(),
            tier: "PRO TIER".to_string(),
            api_key_preview: "sk-ant-...4892".to_string(),
            tokens_used_m: 14.2,
            tokens_max_m: 20.0,
            resets_in: "4d 12h".to_string(),
            rpm_current: 450,
            rpm_max: 1000,
            daily_spend: 12.40,
            daily_cap: 50.00,
            active_ides: 0,
            max_ides: 5,
            instances_linked: 2,
            status: "active".to_string(),
        },
        Account {
            id: "acc-2".to_string(),
            name: "Enterprise Secondary".to_string(),
            email: "research-cluster@org.internal".to_string(),
            tier: "ENTERPRISE".to_string(),
            api_key_preview: "sk-ant-...9104".to_string(),
            tokens_used_m: 88.5,
            tokens_max_m: 100.0,
            resets_in: "1d 4h".to_string(),
            rpm_current: 920,
            rpm_max: 1200,
            daily_spend: 47.80,
            daily_cap: 50.00,
            active_ides: 0,
            max_ides: 10,
            instances_linked: 1,
            status: "warning".to_string(),
        },
        Account {
            id: "acc-3".to_string(),
            name: "Staging Playground".to_string(),
            email: "staging-sandbox@company.io".to_string(),
            tier: "DEV TIER".to_string(),
            api_key_preview: "sk-ant-...3310".to_string(),
            tokens_used_m: 3.1,
            tokens_max_m: 10.0,
            resets_in: "18d 6h".to_string(),
            rpm_current: 120,
            rpm_max: 500,
            daily_spend: 4.10,
            daily_cap: 25.00,
            active_ides: 0,
            max_ides: 3,
            instances_linked: 0,
            status: "active".to_string(),
        },
    ];

    let instances = vec![
        Instance {
            id: "inst-1".to_string(),
            name: "Frontend Monorepo".to_string(),
            account_id: "acc-1".to_string(),
            mode: "auth-only".to_string(),
            port: 9100,
            status: "stopped".to_string(),
            tokens_str: "6.8M tokens".to_string(),
            workspace_path: Some(r"E:\Projects\Vibe Coded Projects\bettermultigravity".to_string()),
            profile_dir: profiles_base.join("FrontendMonorepo").to_string_lossy().to_string(),
            pid: None,
            last_used: "12m ago".to_string(),
            binary_path: None,
            custom_flags: None,
            env_vars: None,
        },
        Instance {
            id: "inst-2".to_string(),
            name: "Core Agent Engine".to_string(),
            account_id: "acc-1".to_string(),
            mode: "auth-only".to_string(),
            port: 9101,
            status: "stopped".to_string(),
            tokens_str: "7.4M tokens".to_string(),
            workspace_path: None,
            profile_dir: profiles_base.join("CoreAgentEngine").to_string_lossy().to_string(),
            pid: None,
            last_used: "2h ago".to_string(),
            binary_path: None,
            custom_flags: None,
            env_vars: None,
        },
        Instance {
            id: "inst-3".to_string(),
            name: "Telemetry & Pipeline".to_string(),
            account_id: "acc-2".to_string(),
            mode: "full".to_string(),
            port: 9102,
            status: "stopped".to_string(),
            tokens_str: "88.5M tokens".to_string(),
            workspace_path: None,
            profile_dir: profiles_base.join("TelemetryPipeline").to_string_lossy().to_string(),
            pid: None,
            last_used: "Yesterday".to_string(),
            binary_path: None,
            custom_flags: None,
            env_vars: None,
        },
    ];

    FleetState { accounts, instances }
}

/// Updates account link counters and running statuses dynamically.
pub fn sync_account_stats(state: &mut FleetState) {
    for account in state.accounts.iter_mut() {
        let matching_instances: Vec<&Instance> = state.instances
            .iter()
            .filter(|inst| inst.account_id == account.id)
            .collect();

        account.instances_linked = matching_instances.len() as u32;
        account.active_ides = matching_instances.iter().filter(|i| i.status == "running").count() as u32;

        if account.tokens_used_m >= (account.tokens_max_m * 0.85) || account.daily_spend >= (account.daily_cap * 0.85) {
            account.status = "warning".to_string();
        } else {
            account.status = "active".to_string();
        }
    }
}

/// Loads fleet state from disk or seeds default state.
pub fn load_fleet_state() -> FleetState {
    let path = get_storage_path();
    if path.exists() {
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(mut state) = serde_json::from_str::<FleetState>(&content) {
                sync_account_stats(&mut state);
                return state;
            }
        }
    }

    let mut seed = get_seed_data();
    sync_account_stats(&mut seed);
    let _ = save_fleet_state(&seed);
    seed
}

/// Persists fleet state to JSON file.
pub fn save_fleet_state(state: &FleetState) -> Result<(), String> {
    let path = get_storage_path();
    let json = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Failed to serialize fleet state: {}", e))?;
    std::fs::write(&path, json)
        .map_err(|e| format!("Failed to write fleet state to {:?}: {}", path, e))?;
    Ok(())
}
