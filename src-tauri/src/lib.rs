pub mod models;
pub mod detector;
pub mod junction;
pub mod telemetry;
pub mod process;
pub mod shortcut;
pub mod storage;
pub mod commands;

use commands::AppState;
use storage::load_fleet_state;

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
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
