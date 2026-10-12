pub mod models;
pub mod detector;
pub mod junction;
pub mod telemetry;
pub mod process;
pub mod shortcut;
pub mod storage;
pub mod dispatcher;
pub mod conversations;
pub mod commands;
pub mod quota;

pub use process::silent_command;

use commands::AppState;
use storage::load_fleet_state;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_state = load_fleet_state();
    let app_state = AppState::new(initial_state);

    tauri::Builder::default()
        .manage(app_state)
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            if let Some(window) = app.get_webview_window("main") {
                if let Some(icon) = app.default_window_icon() {
                    let _ = window.set_icon(icon.clone());
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_system_info,
            commands::list_accounts,
            commands::save_account,
            commands::delete_account,
            commands::reset_account_cycle,
            commands::list_instances,
            commands::create_instance,
            commands::update_instance,
            commands::launch_instance,
            commands::stop_instance,
            commands::delete_instance,
            commands::create_desktop_shortcut,
            commands::window_minimize,
            commands::window_toggle_maximize,
            commands::window_close,
            commands::window_start_drag,
            commands::get_available_binaries,
            commands::pick_folder,
            commands::pick_file,
            commands::open_in_explorer,
            commands::enable_protocol_dispatcher,
            commands::restore_original_protocols,
            commands::get_protocol_dispatcher_status,
            commands::set_active_auth_instance,
            commands::dispatch_url_to_instance,
            commands::list_conversations,
            commands::import_conversations,
            commands::transfer_conversation,
            commands::get_shared_brain_status,
            commands::sync_all_shared_brains,
            commands::get_parent_binaries,
            commands::set_parent_binaries,
            commands::pick_executable_file,
            commands::launch_parent_app,
            commands::attach_instance_to_blackhole,
            commands::detach_instance_from_blackhole,
            commands::get_cosmic_systems_overview,
            commands::sync_instance_conversations,
            commands::sync_instance_brain,
            commands::get_parent_process_status,
            commands::terminate_parent_app,
            commands::delete_conversation,
            commands::get_all_antigravity_quotas,
            commands::get_instance_quota_summary,
            commands::get_conversation_transcript,
            commands::list_available_groups,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
