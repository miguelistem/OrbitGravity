use app_lib::detector::{check_junction_support, detect_antigravity_binary, detect_all_antigravity_binaries, detect_binary_for_app_type, get_base_profiles_dir, get_system_extensions_dir};
use app_lib::junction::{create_junction, remove_junction, setup_profile_directories};
use app_lib::shortcut::{create_windows_shortcut, create_instance_desktop_shortcut};
use app_lib::storage::{get_seed_data, sync_account_stats};
use app_lib::telemetry::calculate_storage_saved_mb;
use app_lib::models::Instance;

#[test]
fn test_antigravity_binary_detection() {
    let detected = detect_antigravity_binary();
    println!("Detected binary: {:?}", detected);
    assert!(detected.is_some(), "Antigravity binary should be detected on this machine");
    let bin_path = detected.unwrap();
    assert!(bin_path.exists(), "Detected binary must exist on disk");
    assert!(bin_path.is_file(), "Detected binary must be a file");
}

#[test]
fn test_all_antigravity_binaries_detection() {
    let all = detect_all_antigravity_binaries();
    println!("All detected binaries: {:?}", all);
    assert!(!all.is_empty(), "Should detect at least one Antigravity binary");
    for b in &all {
        assert!(std::path::Path::new(&b.path).exists(), "Binary path must exist on disk: {}", b.path);
    }
}

#[test]
fn test_base_profiles_dir() {
    let base = get_base_profiles_dir();
    println!("Base profiles dir: {:?}", base);
    assert!(base.to_string_lossy().contains("AntigravityProfiles"));
}

#[test]
fn test_junction_support() {
    let support = check_junction_support();
    println!("Junction support: {}", support);
    assert!(support, "NTFS junction support should be true on modern Windows");
}

#[test]
fn test_system_extensions_dir() {
    let ext_dir = get_system_extensions_dir();
    println!("System extensions dir: {:?}", ext_dir);
    assert!(ext_dir.to_string_lossy().contains("extensions"));
}

#[test]
fn test_seed_data_and_stat_sync() {
    let mut state = get_seed_data();
    assert_eq!(state.accounts.len(), 3);
    assert_eq!(state.instances.len(), 3);

    sync_account_stats(&mut state);

    let acc1 = state.accounts.iter().find(|a| a.id == "acc-1").unwrap();
    assert_eq!(acc1.instances_linked, 2);
    assert_eq!(acc1.active_ides, 0);

    let acc2 = state.accounts.iter().find(|a| a.id == "acc-2").unwrap();
    assert_eq!(acc2.instances_linked, 1);
    assert_eq!(acc2.status, "warning"); // Because 88.5M is > 85% of 100M tokens_max
}

#[test]
fn test_junction_lifecycle() {
    let temp_root = std::env::temp_dir().join(format!("bm_test_junc_{}", uuid::Uuid::new_v4()));
    let target = temp_root.join("shared_ext");
    let link = temp_root.join("profile").join("extensions");

    std::fs::create_dir_all(&target).expect("create target");
    std::fs::write(target.join("ext_sample.txt"), "sample extension content").expect("write sample");

    let junc_res = create_junction(&link, &target);
    assert!(junc_res.is_ok(), "create_junction should succeed");
    assert!(link.exists(), "Junction link should exist");

    // Reading file through the junction link
    let read_through = std::fs::read_to_string(link.join("ext_sample.txt")).expect("read through junction");
    assert_eq!(read_through, "sample extension content");

    // Remove junction safely
    let rem_res = remove_junction(&link);
    assert!(rem_res.is_ok(), "remove_junction should succeed");
    assert!(!link.exists(), "Link should no longer exist");
    assert!(target.exists(), "Target directory must remain intact");
    assert!(target.join("ext_sample.txt").exists(), "Target file must remain intact");

    let _ = std::fs::remove_dir_all(&temp_root);
}

#[test]
fn test_profile_directory_setup() {
    let temp_profile = std::env::temp_dir().join(format!("bm_test_profile_{}", uuid::Uuid::new_v4()));

    let setup_res = setup_profile_directories(&temp_profile, "auth-only");
    assert!(setup_res.is_ok());

    assert!(temp_profile.join("data").exists(), "data dir must exist");
    assert!(temp_profile.join("extensions").exists(), "extensions junction must exist");
    assert!(temp_profile.join("appdata").join("Roaming").exists(), "roaming dir must exist");
    assert!(temp_profile.join("appdata").join("Local").exists(), "local dir must exist");

    // Cleanup
    let _ = remove_junction(&temp_profile.join("extensions"));
    let _ = std::fs::remove_dir_all(&temp_profile);
}

#[test]
fn test_storage_saved_calculation() {
    let saved_0 = calculate_storage_saved_mb(0);
    assert_eq!(saved_0, 0.0);

    let saved_3 = calculate_storage_saved_mb(3);
    assert!(saved_3 > 0.0, "Storage saved for 3 instances must be greater than 0");
    println!("Storage saved for 3 instances: {} MB", saved_3);
}

#[test]
fn test_shortcut_creation() {
    let detected = detect_antigravity_binary();
    if let Some(binary) = detected {
        let temp_dir = std::env::temp_dir().join(format!("bm_test_sc_{}", uuid::Uuid::new_v4()));
        let sc_path = temp_dir.join("TestShortcut.lnk");
        let work_dir = temp_dir.clone();

        let res = create_windows_shortcut(
            &sc_path,
            &binary,
            "--user-data-dir=\"C:\\Temp\\test\" --new-window",
            &work_dir,
            "Test Description",
        );

        assert!(res.is_ok(), "Shortcut creation should succeed: {:?}", res);
        assert!(sc_path.exists(), "Shortcut file .lnk must exist");

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}

#[test]
fn test_detect_binary_for_app_type() {
    let ide_bin = detect_binary_for_app_type("antigravity_ide");
    let app_bin = detect_binary_for_app_type("antigravity");

    println!("Detected IDE bin: {:?}", ide_bin);
    println!("Detected standalone app bin: {:?}", app_bin);

    assert!(ide_bin.is_some(), "Should find IDE binary on this system");
    assert!(app_bin.is_some(), "Should find App binary on this system");

    let ide_str = ide_bin.unwrap().to_string_lossy().to_lowercase();
    let app_str = app_bin.unwrap().to_string_lossy().to_lowercase();

    assert!(ide_str.contains("ide"), "IDE binary path should contain 'ide'");
    assert!(app_str.contains("antigravity"), "App binary path should contain 'antigravity'");
}

#[test]
fn test_instance_desktop_shortcut_with_bat() {
    let ide_bin = detect_binary_for_app_type("antigravity_ide");
    if let Some(binary) = ide_bin {
        let temp_dir = std::env::temp_dir().join(format!("bm_test_inst_sc_{}", uuid::Uuid::new_v4()));
        let _ = std::fs::create_dir_all(&temp_dir);

        let test_instance = Instance {
            id: "test-sc-id".to_string(),
            name: "TestInstance".to_string(),
            account_id: "acc-1".to_string(),
            mode: "auth-only".to_string(),
            port: 9999,
            status: "stopped".to_string(),
            tokens_str: "0.0M tokens".to_string(),
            workspace_path: Some(temp_dir.to_string_lossy().to_string()),
            profile_dir: temp_dir.to_string_lossy().to_string(),
            pid: None,
            last_used: "Now".to_string(),
            binary_path: None,
            custom_flags: Some("--test-flag".to_string()),
            env_vars: None,
            app_type: Some("antigravity_ide".to_string()),
        };

        let res = create_instance_desktop_shortcut(&test_instance, &binary, None);
        assert!(res.is_ok(), "create_instance_desktop_shortcut should succeed: {:?}", res);
        
        let bat_path = temp_dir.join("launch.bat");
        assert!(bat_path.exists(), "launch.bat must be created in profile directory");
        
        let bat_content = std::fs::read_to_string(&bat_path).unwrap();
        assert!(bat_content.contains("SSH_CONNECTION=127.0.0.1 1234 127.0.0.1 22"), "launch.bat must set SSH_CONNECTION");
        assert!(bat_content.contains("--user-data-dir="), "launch.bat must include user-data-dir");
        assert!(bat_content.contains("--test-flag"), "launch.bat must include custom flags");

        if let Ok(sc_path) = res {
            assert!(sc_path.exists(), "Desktop .lnk shortcut must exist on disk");
            let _ = std::fs::remove_file(&sc_path);
        }

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
