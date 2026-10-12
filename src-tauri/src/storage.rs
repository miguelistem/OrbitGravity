use std::path::PathBuf;
use crate::models::{Account, FleetState, Instance};

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
            instances_linked: 0,
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
            instances_linked: 0,
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

    let instances = Vec::new();

    FleetState {
        accounts,
        instances,
        parent_binaries: Some(detect_default_parent_binaries()),
    }
}

/// Helper to detect default parent binaries
pub fn detect_default_parent_binaries() -> crate::models::ParentBinaries {
    let app = crate::detector::detect_binary_for_app_type("app").map(|p| p.to_string_lossy().to_string());
    let ide = crate::detector::detect_binary_for_app_type("ide").map(|p| p.to_string_lossy().to_string());
    crate::models::ParentBinaries {
        app_path: app,
        ide_path: ide,
        custom_configured: false,
    }
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
                if state.parent_binaries.is_none() {
                    let app = crate::detector::detect_binary_for_app_type("app").map(|p| p.to_string_lossy().to_string());
                    let ide = crate::detector::detect_binary_for_app_type("ide").map(|p| p.to_string_lossy().to_string());
                    state.parent_binaries = Some(crate::models::ParentBinaries {
                        app_path: app,
                        ide_path: ide,
                        custom_configured: false,
                    });
                }
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
