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
            blackhole_sync: None,
            sync_mode: None,
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

#[test]
fn test_profile_cleanup_on_delete() {
    let temp_profile = std::env::temp_dir().join(format!("bm_test_del_prof_{}", uuid::Uuid::new_v4()));
    let setup_res = setup_profile_directories(&temp_profile, "auth-only");
    assert!(setup_res.is_ok(), "Setup profile directories should succeed");
    assert!(temp_profile.exists(), "Profile directory should exist before delete");

    // Mimic delete_instance cleanup
    let ext_link = temp_profile.join("extensions");
    let _ = remove_junction(&ext_link);
    assert!(!ext_link.exists(), "Extension junction should be unlinked");

    let _ = std::fs::remove_dir_all(&temp_profile);
    assert!(!temp_profile.exists(), "Profile directory must be completely removed from disk");
}

#[test]
fn test_dispatcher_scripts_exist() {
    let res = app_lib::dispatcher::ensure_dispatcher_scripts_exist();
    assert!(res.is_ok(), "Dispatcher scripts should be generated");
    let app_dir = app_lib::dispatcher::get_local_app_data_dir();
    assert!(app_dir.join("dispatcher.ps1").exists(), "dispatcher.ps1 must exist");
    assert!(app_dir.join("dispatcher.vbs").exists(), "dispatcher.vbs must exist");
}

#[test]
fn test_dispatcher_registry_backup_path() {
    let backup_path = app_lib::dispatcher::get_backup_path();
    assert!(backup_path.to_string_lossy().contains("registry_backup.json"));
}

#[test]
fn test_list_conversations_global() {
    let convs = app_lib::conversations::list_conversations_for_source(None, "antigravity", true, "Global");
    println!("Found global conversations: {}", convs.len());
    assert!(!convs.is_empty(), "Should discover conversations from global .gemini folder");
}

#[test]
fn test_shared_brains_base_dir() {
    let base = app_lib::conversations::get_shared_brains_base_dir();
    assert!(base.to_string_lossy().contains("_shared_brains"));
}

#[test]
fn test_blackhole_attachment_and_detachment() {
    let temp_profile = std::env::temp_dir().join(format!("bm_test_bh_{}", uuid::Uuid::new_v4()));
    let _ = std::fs::create_dir_all(&temp_profile);

    let inst = Instance {
        id: "test-bh-inst".to_string(),
        name: "BlackHole Tester".to_string(),
        account_id: "acc-1".to_string(),
        mode: "auth-only".to_string(),
        port: 3000,
        status: "stopped".to_string(),
        tokens_str: "0".to_string(),
        workspace_path: Some(temp_profile.to_string_lossy().to_string()),
        profile_dir: temp_profile.to_string_lossy().to_string(),
        pid: None,
        last_used: "Never".to_string(),
        binary_path: None,
        custom_flags: None,
        env_vars: None,
        app_type: Some("antigravity_ide".to_string()),
        blackhole_sync: Some(true),
        sync_mode: Some("black_hole".to_string()),
    };

    let attach_res = app_lib::conversations::attach_instance_to_blackhole(&inst);
    assert!(attach_res.is_ok(), "Attaching instance to blackhole should succeed");

    let status = app_lib::conversations::get_instance_shared_brain_status(&inst, &[inst.clone()]);
    assert!(status.group_name.contains("Black Hole"), "Shared brain status should reflect Black Hole");

    let detach_res = app_lib::conversations::detach_instance_from_blackhole(&inst);
    assert!(detach_res.is_ok(), "Detaching instance from blackhole should succeed");

    let _ = std::fs::remove_dir_all(&temp_profile);
}

#[test]
fn test_parent_binaries_defaults() {
    let parent = app_lib::storage::detect_default_parent_binaries();
    assert!(parent.app_path.is_some() || parent.ide_path.is_some() || !parent.custom_configured);
}

#[test]
fn test_sync_instance_on_session_start_blackhole() {
    let temp_profile = std::env::temp_dir().join(format!("bm_test_launch_sync_{}", uuid::Uuid::new_v4()));
    let _ = app_lib::junction::setup_profile_directories(&temp_profile, "auth-only");

    let inst = Instance {
        id: "test-launch-sync-id".to_string(),
        name: "TestSyncInst".to_string(),
        account_id: "acc-1".to_string(),
        mode: "auth-only".to_string(),
        port: 9998,
        status: "stopped".to_string(),
        tokens_str: "0.0M tokens".to_string(),
        workspace_path: Some(temp_profile.to_string_lossy().to_string()),
        profile_dir: temp_profile.to_string_lossy().to_string(),
        pid: None,
        last_used: "Never".to_string(),
        binary_path: None,
        custom_flags: None,
        env_vars: None,
        app_type: Some("antigravity".to_string()),
        blackhole_sync: Some(true),
        sync_mode: Some("black_hole".to_string()),
    };

    let sync_res = app_lib::conversations::sync_instance_on_session_start(&inst);
    assert!(sync_res.is_ok(), "sync_instance_on_session_start should succeed: {:?}", sync_res);

    // Verify .gemini/antigravity is a real decoupled isolated directory (NOT a raw junction)
    let inst_gemini = temp_profile.join(".gemini").join("antigravity");
    assert!(inst_gemini.exists(), ".gemini/antigravity must exist");
    assert!(!app_lib::conversations::is_junction_or_symlink(&inst_gemini), ".gemini/antigravity must NOT be a junction to prevent master deletions");

    // Verify data/app_storage.json exists
    let app_storage = temp_profile.join("data").join("app_storage.json");
    assert!(app_storage.exists(), "data/app_storage.json must exist after sync");

    // Detach and clean up
    let _ = app_lib::conversations::detach_instance_from_blackhole(&inst);
    let ext_link = temp_profile.join("extensions");
    let _ = app_lib::junction::remove_junction(&ext_link);
    let _ = std::fs::remove_dir_all(&temp_profile);
}

#[test]
fn test_atomic_sync_forward_upgrade_27_over_25() {
    let temp_root = std::env::temp_dir().join(format!("bm_test_forward_sync_{}", uuid::Uuid::new_v4()));
    let local_dir = temp_root.join("local_gemini");
    let master_dir = temp_root.join("master_gemini");

    let conv_id = "test-conv-matrix-forward-upgrade";
    let loc_conv_dir = local_dir.join("brain").join(conv_id).join(".system_generated").join("logs");
    let mst_conv_dir = master_dir.join("brain").join(conv_id).join(".system_generated").join("logs");

    std::fs::create_dir_all(&loc_conv_dir).expect("create local logs");
    std::fs::create_dir_all(&mst_conv_dir).expect("create master logs");

    // Write 27 steps to local conversation
    let mut loc_content = String::new();
    for i in 1..=27 {
        loc_content.push_str(&format!("{{\"step_index\": {}, \"content\": \"step {}\"}}\n", i, i));
    }
    std::fs::write(loc_conv_dir.join("transcript.jsonl"), &loc_content).expect("write local transcript");

    // Write 25 steps to master conversation
    let mut mst_content = String::new();
    for i in 1..=25 {
        mst_content.push_str(&format!("{{\"step_index\": {}, \"content\": \"step {}\"}}\n", i, i));
    }
    std::fs::write(mst_conv_dir.join("transcript.jsonl"), &mst_content).expect("write master transcript");

    let report = app_lib::conversations::atomic_sync_gemini_pair(&local_dir, &master_dir)
        .expect("atomic sync should succeed");

    // Local had 27 steps, Master had 25 steps -> Master should be forward upgraded!
    assert_eq!(report.updated_master, 1, "Master should be updated because local has more steps");
    assert_eq!(report.updated_local, 0, "Local should not be touched since it is ahead");

    let (master_steps, _) = app_lib::conversations::get_conversation_step_count(
        &master_dir.join("brain").join(conv_id)
    );
    assert_eq!(master_steps, 27, "Master conversation must now have 27 steps after forward sync");

    let _ = std::fs::remove_dir_all(&temp_root);
}

#[test]
fn test_atomic_sync_anti_rollback_protection_master_retains_25() {
    let temp_root = std::env::temp_dir().join(format!("bm_test_anti_rollback_{}", uuid::Uuid::new_v4()));
    let local_dir = temp_root.join("local_gemini");
    let master_dir = temp_root.join("master_gemini");

    let conv_a = "test-conv-anti-rollback-a";
    let loc_a_dir = local_dir.join("brain").join(conv_a).join(".system_generated").join("logs");
    let mst_a_dir = master_dir.join("brain").join(conv_a).join(".system_generated").join("logs");

    std::fs::create_dir_all(&loc_a_dir).expect("create local A logs");
    std::fs::create_dir_all(&mst_a_dir).expect("create master A logs");

    // Master has 25 steps
    let mut mst_content = String::new();
    for i in 1..=25 {
        mst_content.push_str(&format!("{{\"step_index\": {}, \"content\": \"step {}\"}}\n", i, i));
    }
    std::fs::write(mst_a_dir.join("transcript.jsonl"), &mst_content).expect("write master transcript");

    // Local has stale 5 steps
    let mut loc_content = String::new();
    for i in 1..=5 {
        loc_content.push_str(&format!("{{\"step_index\": {}, \"content\": \"step {}\"}}\n", i, i));
    }
    std::fs::write(loc_a_dir.join("transcript.jsonl"), &loc_content).expect("write local transcript");

    // Add another conversation B present only in master (e.g. 10 steps)
    let conv_b = "test-conv-master-only-b";
    let mst_b_dir = master_dir.join("brain").join(conv_b).join(".system_generated").join("logs");
    std::fs::create_dir_all(&mst_b_dir).expect("create master B logs");
    let mut mst_b_content = String::new();
    for i in 1..=10 {
        mst_b_content.push_str(&format!("{{\"step_index\": {}, \"content\": \"b step {}\"}}\n", i, i));
    }
    std::fs::write(mst_b_dir.join("transcript.jsonl"), &mst_b_content).expect("write master B transcript");

    let report = app_lib::conversations::atomic_sync_gemini_pair(&local_dir, &master_dir)
        .expect("atomic sync should succeed");

    // Master had 25 steps, Local had 5 steps -> Anti-rollback: Master stays 25, Local updated to 25
    assert_eq!(report.updated_master, 0, "Master must NEVER be downgraded by stale local profile");
    assert_eq!(report.updated_local, 1, "Local should catch up to master's 25 steps");
    assert_eq!(report.pulled, 1, "Conversation B should be pulled into local (zero deletions)");

    let (mst_a_steps, _) = app_lib::conversations::get_conversation_step_count(
        &master_dir.join("brain").join(conv_a)
    );
    assert_eq!(mst_a_steps, 25, "Master conversation A must still have all 25 steps intact");

    let (loc_a_steps, _) = app_lib::conversations::get_conversation_step_count(
        &local_dir.join("brain").join(conv_a)
    );
    assert_eq!(loc_a_steps, 25, "Local conversation A must have caught up to 25 steps");

    // Confirm conversation B now exists in local
    let (loc_b_steps, _) = app_lib::conversations::get_conversation_step_count(
        &local_dir.join("brain").join(conv_b)
    );
    assert_eq!(loc_b_steps, 10, "Local conversation B must have 10 steps pulled from master");

    let _ = std::fs::remove_dir_all(&temp_root);
}

#[test]
fn test_concurrency_guard_mutual_exclusion() {
    let inst_bh_1 = Instance {
        id: "inst-bh-1".to_string(),
        name: "BlackHole 1".to_string(),
        account_id: "acc-1".to_string(),
        mode: "auth-only".to_string(),
        port: 3001,
        status: "running".to_string(),
        tokens_str: "0".to_string(),
        workspace_path: None,
        profile_dir: "C:\\Users\\User\\AntigravityProfiles\\BH1".to_string(),
        pid: Some(1234),
        last_used: "Now".to_string(),
        binary_path: None,
        custom_flags: None,
        env_vars: None,
        app_type: Some("antigravity_ide".to_string()),
        blackhole_sync: Some(true),
        sync_mode: Some("black_hole".to_string()),
    };

    let inst_bh_2 = Instance {
        id: "inst-bh-2".to_string(),
        name: "BlackHole 2".to_string(),
        account_id: "acc-1".to_string(),
        mode: "auth-only".to_string(),
        port: 3002,
        status: "stopped".to_string(),
        tokens_str: "0".to_string(),
        workspace_path: None,
        profile_dir: "C:\\Users\\User\\AntigravityProfiles\\BH2".to_string(),
        pid: None,
        last_used: "Never".to_string(),
        binary_path: None,
        custom_flags: None,
        env_vars: None,
        app_type: Some("antigravity_ide".to_string()),
        blackhole_sync: Some(true),
        sync_mode: Some("black_hole".to_string()),
    };

    // BH 1 is running -> Launching BH 2 must fail due to mutual exclusion
    let bh_guard = app_lib::process::check_launch_concurrency_guard(&inst_bh_2, &[inst_bh_1.clone(), inst_bh_2.clone()]);
    assert!(bh_guard.is_err(), "Launching Black Hole instance while another is running must be blocked");
    assert!(bh_guard.unwrap_err().contains("Black Hole"));

    // Solar System concurrency:
    let inst_sol_ide_1 = Instance {
        id: "inst-sol-1".to_string(),
        name: "Solar Project IDE 1".to_string(),
        account_id: "acc-1".to_string(),
        mode: "auth-only".to_string(),
        port: 3003,
        status: "running".to_string(),
        tokens_str: "0".to_string(),
        workspace_path: None,
        profile_dir: "C:\\Users\\User\\AntigravityProfiles\\ProjectAlpha\\IDE1".to_string(),
        pid: Some(5678),
        last_used: "Now".to_string(),
        binary_path: None,
        custom_flags: None,
        env_vars: None,
        app_type: Some("antigravity_ide".to_string()),
        blackhole_sync: Some(false),
        sync_mode: Some("solar_system".to_string()),
    };

    let inst_sol_ide_2 = Instance {
        id: "inst-sol-2".to_string(),
        name: "Solar Project IDE 2".to_string(),
        account_id: "acc-1".to_string(),
        mode: "auth-only".to_string(),
        port: 3004,
        status: "stopped".to_string(),
        tokens_str: "0".to_string(),
        workspace_path: None,
        profile_dir: "C:\\Users\\User\\AntigravityProfiles\\ProjectAlpha\\IDE2".to_string(),
        pid: None,
        last_used: "Never".to_string(),
        binary_path: None,
        custom_flags: None,
        env_vars: None,
        app_type: Some("antigravity_ide".to_string()),
        blackhole_sync: Some(false),
        sync_mode: Some("solar_system".to_string()),
    };

    // Both are IDE in ProjectAlpha: launching IDE 2 while IDE 1 is running must fail
    let sol_guard_same = app_lib::process::check_launch_concurrency_guard(&inst_sol_ide_2, &[inst_sol_ide_1.clone(), inst_sol_ide_2.clone()]);
    assert!(sol_guard_same.is_err(), "Launching same app type in same solar system must be blocked");
    assert!(sol_guard_same.unwrap_err().contains("Solar System"));

    // Different variant (Desktop app) in same ProjectAlpha: allowed!
    let inst_sol_desktop = Instance {
        id: "inst-sol-desktop".to_string(),
        name: "Solar Project Desktop".to_string(),
        account_id: "acc-1".to_string(),
        mode: "auth-only".to_string(),
        port: 3005,
        status: "stopped".to_string(),
        tokens_str: "0".to_string(),
        workspace_path: None,
        profile_dir: "C:\\Users\\User\\AntigravityProfiles\\ProjectAlpha\\Desktop".to_string(),
        pid: None,
        last_used: "Never".to_string(),
        binary_path: None,
        custom_flags: None,
        env_vars: None,
        app_type: Some("antigravity".to_string()),
        blackhole_sync: Some(false),
        sync_mode: Some("solar_system".to_string()),
    };

    let sol_guard_diff = app_lib::process::check_launch_concurrency_guard(&inst_sol_desktop, &[inst_sol_ide_1.clone(), inst_sol_desktop.clone()]);
    assert!(sol_guard_diff.is_ok(), "Launching different app variant (Desktop vs IDE) in same solar system is allowed");
}

#[test]
fn test_delete_conversation_record() {
    let temp_root = std::env::temp_dir().join(format!("bm_test_del_conv_{}", uuid::Uuid::new_v4()));
    let profile_dir = temp_root.to_string_lossy().to_string();

    let conv_id = "test-conv-to-delete-123";
    let brain_dir = temp_root.join(".gemini").join("antigravity-ide").join("brain").join(conv_id);
    let meta_dir = temp_root.join(".gemini").join("antigravity-ide").join("conversations").join(conv_id);
    let data_dir = temp_root.join("data");

    std::fs::create_dir_all(&brain_dir).expect("create brain dir");
    std::fs::create_dir_all(&meta_dir).expect("create meta dir");
    std::fs::create_dir_all(&data_dir).expect("create data dir");

    // Create dummy files inside brain and meta
    std::fs::write(brain_dir.join("sample.txt"), "dummy transcript").expect("write sample");
    std::fs::write(meta_dir.join("meta.json"), "{\"title\":\"dummy\"}").expect("write meta");

    // Create app_storage.json with layout index containing this conversation
    let storage_path = data_dir.join("app_storage.json");
    let storage_json = serde_json::json!({
        "antigravity-multi-conversation-layout-v3-index": format!("[{{\"conversationId\":\"{}\"}},{{\"conversationId\":\"keep-this-one\"}}]", conv_id),
        format!("antigravity-active-conversation-{}", conv_id): true,
        "antigravity-active-conversation-keep-this-one": true
    });
    std::fs::write(&storage_path, serde_json::to_string_pretty(&storage_json).unwrap()).expect("write storage");

    assert!(brain_dir.exists(), "Brain dir must exist before deletion");
    assert!(meta_dir.exists(), "Meta dir must exist before deletion");

    // Perform deletion
    let del_res = app_lib::conversations::delete_conversation_record(
        Some(&profile_dir),
        Some("antigravity_ide"),
        false,
        conv_id,
        false,
    );
    assert!(del_res.is_ok(), "delete_conversation_record should succeed");

    // Verify directories removed
    assert!(!brain_dir.exists(), "Brain directory must be purged");
    assert!(!meta_dir.exists(), "Meta directory must be purged");

    // Verify app_storage.json layout cleaned
    let updated_storage: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(&storage_path).unwrap()
    ).unwrap();
    let obj = updated_storage.as_object().unwrap();
    assert!(!obj.contains_key(&format!("antigravity-active-conversation-{}", conv_id)));
    assert!(obj.contains_key("antigravity-active-conversation-keep-this-one"));

    let idx_str = obj.get("antigravity-multi-conversation-layout-v3-index").unwrap().as_str().unwrap();
    assert!(!idx_str.contains(conv_id), "Index array must no longer contain deleted conversation");
    assert!(idx_str.contains("keep-this-one"), "Index array must keep other conversations");

    let _ = std::fs::remove_dir_all(&temp_root);
}

#[test]
fn test_parent_process_telemetry() {
    let parent_info = app_lib::process::get_parent_process_info();
    assert_eq!(parent_info.is_running, parent_info.app_running || parent_info.ide_running);
}

#[test]
fn test_is_parent_antigravity_process_filters_user_data_dir() {
    // Isolated sandbox with AntigravityProfile2: must NOT be identified as parent
    let (is_p, is_ide) = app_lib::process::is_parent_antigravity_process(
        "Antigravity.exe",
        "\"C:\\Users\\Developer\\AppData\\Local\\Programs\\antigravity\\antigravity.exe\"  --user-data-dir=\"C:\\Users\\Developer\\AntigravityProfile2\"",
    );
    assert!(!is_p, "Process with custom --user-data-dir must NOT be identified as parent");
    assert!(!is_ide);

    // Isolated sandbox with BAM data dir: must NOT be identified as parent
    let (is_p2, _) = app_lib::process::is_parent_antigravity_process(
        "Antigravity.exe",
        "\"C:\\Users\\Developer\\AppData\\Local\\Programs\\antigravity\\Antigravity.exe\" --user-data-dir=\"C:\\Users\\Developer\\AntigravityProfiles\\BAM\\data\" --extensions-dir=\"C:\\Users\\Developer\\AntigravityProfiles\\BAM\\extensions\" --new-window",
    );
    assert!(!is_p2, "Process with profile data dir must NOT be identified as parent");

    // Process with empty command line must NOT be identified as parent (prevents false positives)
    let (is_p_empty, _) = app_lib::process::is_parent_antigravity_process("Antigravity.exe", "");
    assert!(!is_p_empty, "Process with empty command line must NOT be identified as parent");

    let (is_p_ws, _) = app_lib::process::is_parent_antigravity_process("Antigravity.exe", "   ");
    assert!(!is_p_ws, "Process with whitespace command line must NOT be identified as parent");

    // Genuine parent Desktop app (no --user-data-dir): must be identified as parent
    let (is_parent_app, is_ide_app) = app_lib::process::is_parent_antigravity_process(
        "Antigravity.exe",
        "\"C:\\Users\\Developer\\AppData\\Local\\Programs\\antigravity\\Antigravity.exe\" --new-window",
    );
    assert!(is_parent_app, "Genuine Antigravity app without --user-data-dir must be identified as parent");
    assert!(!is_ide_app, "Should not be IDE");

    // Genuine parent IDE (no --user-data-dir): must be identified as parent IDE
    let (is_parent_ide, is_ide_flag) = app_lib::process::is_parent_antigravity_process(
        "Antigravity IDE.exe",
        "\"C:\\Users\\Developer\\AppData\\Local\\Programs\\Antigravity IDE\\Antigravity IDE.exe\" --new-window",
    );
    assert!(is_parent_ide, "Genuine Antigravity IDE without --user-data-dir must be identified as parent");
    assert!(is_ide_flag, "Should be IDE");
}

#[test]
fn test_tracked_pids_concurrency_guard() {
    let current_pid = std::process::id();

    let inst_bh = Instance {
        id: "inst-bh-tracked".to_string(),
        name: "Tracked Black Hole".to_string(),
        account_id: "acc-1".to_string(),
        mode: "auth-only".to_string(),
        port: 3009,
        status: "stopped".to_string(),
        tokens_str: "0".to_string(),
        workspace_path: None,
        profile_dir: "C:\\Users\\User\\AntigravityProfiles\\TrackedBH".to_string(),
        pid: None,
        last_used: "Never".to_string(),
        binary_path: None,
        custom_flags: None,
        env_vars: None,
        app_type: Some("antigravity".to_string()),
        blackhole_sync: Some(true),
        sync_mode: Some("black_hole".to_string()),
    };

    // When current_pid is in tracked_parent_pids (known alive process): mutual exclusion MUST block launch!
    let guard_res = app_lib::process::check_launch_concurrency_guard_with_tracked(
        &inst_bh,
        &[],
        Some(&[current_pid]),
    );
    assert!(guard_res.is_err(), "Must block Black Hole instance when parent PID is actively tracked and alive");
    assert!(guard_res.unwrap_err().contains("Parent Antigravity application is currently running"));
}

#[test]
fn test_terminate_parent_skips_user_data_dir_processes() {
    let mut sys = sysinfo::System::new();
    sys.refresh_processes_specifics(
        sysinfo::ProcessesToUpdate::All,
        true,
        sysinfo::ProcessRefreshKind::everything(),
    );
    for (pid, proc) in sys.processes() {
        let cmd: Vec<String> = proc.cmd().iter().map(|s| s.to_string_lossy().to_string()).collect();
        let cmd_str = cmd.join(" ");
        if cmd_str.contains("--user-data-dir") {
            // This PID is a profile instance. Even if passed as a tracked PID, parent info must ignore it!
            let info = app_lib::process::get_parent_process_info_with_tracked(Some(&[pid.as_u32()]));
            assert!(!info.pids.contains(&pid.as_u32()), "Tracked PID with --user-data-dir must not be treated as parent process");
        }
    }
}

#[test]
fn test_transfer_injects_layout_to_destination_storage() {
    let temp_root = std::env::temp_dir().join(format!("bm_test_trans_{}", uuid::Uuid::new_v4()));
    let src_dir = temp_root.join("src_prof");
    let dest_dir = temp_root.join("dest_prof");
    let conv_id = "test-conv-layout-transfer-123";

    // Setup source conversation in src_dir/.gemini/antigravity/brain/<conv_id>
    let src_brain = src_dir.join(".gemini").join("antigravity").join("brain").join(conv_id);
    std::fs::create_dir_all(&src_brain).unwrap();
    std::fs::write(src_brain.join("test.txt"), "sample").unwrap();

    let res = app_lib::conversations::copy_conversation_to_target(
        Some(&src_dir.to_string_lossy()),
        "antigravity",
        false,
        &dest_dir.to_string_lossy(),
        "antigravity",
        conv_id,
    );
    assert!(res.is_ok(), "copy_conversation_to_target must succeed");

    // 1. Verify files exist in dest brain
    let dest_brain = dest_dir.join(".gemini").join("antigravity").join("brain").join(conv_id);
    assert!(dest_brain.exists(), "Destination brain directory must exist");
    assert!(dest_brain.join("test.txt").exists());

    // 2. Verify destination app_storage.json has layout key and index array entry
    let dest_storage = dest_dir.join("data").join("app_storage.json");
    assert!(dest_storage.exists(), "Destination data app_storage.json must exist");
    let content = std::fs::read_to_string(&dest_storage).unwrap();
    let val: serde_json::Value = serde_json::from_str(&content).unwrap();

    let layout_key = format!("antigravity-multi-conversation-layout-v3-{}", conv_id);
    assert!(val.get(&layout_key).is_some(), "Layout key must be present in dest app_storage.json");

    let idx = val.get("antigravity-multi-conversation-layout-v3-index").and_then(|v| v.as_array()).unwrap();
    assert!(idx.contains(&serde_json::Value::String(conv_id.to_string())), "Index array must contain conversation id");

    // 3. Verify Roaming storage also has layout key
    let roaming_storage = dest_dir.join("appdata").join("Roaming").join("Antigravity").join("app_storage.json");
    assert!(roaming_storage.exists(), "Roaming storage must exist");
    let r_content = std::fs::read_to_string(&roaming_storage).unwrap();
    let r_val: serde_json::Value = serde_json::from_str(&r_content).unwrap();
    assert!(r_val.get(&layout_key).is_some(), "Layout key must be present in Roaming app_storage.json");

    let _ = std::fs::remove_dir_all(&temp_root);
}

#[test]
fn test_solar_system_convergent_sync_propagates_to_all_members() {
    let temp_root = std::env::temp_dir().join(format!("bm_test_ss_fleet_{}", uuid::Uuid::new_v4()));
    let group = format!("Group_{}", uuid::Uuid::new_v4());

    let p1 = temp_root.join(&group).join("inst1");
    let p2 = temp_root.join(&group).join("inst2");
    let conv_id = "test-conv-fleet-converge-456";

    // Create inst1 conversation
    let inst1_brain = p1.join(".gemini").join("antigravity").join("brain").join(conv_id);
    std::fs::create_dir_all(&inst1_brain).unwrap();
    std::fs::write(inst1_brain.join("data.txt"), "fleet sync").unwrap();

    // Inject layout to inst1 storage
    let p1_storage = p1.join("data").join("app_storage.json");
    app_lib::conversations::inject_conversation_layout_to_storage(
        conv_id,
        None,
        &[p1_storage],
    );

    let instances = vec![
        Instance {
            id: "i-1".to_string(),
            name: "Instance 1".to_string(),
            account_id: "acc-1".to_string(),
            mode: "auth-only".to_string(),
            port: 3001,
            status: "stopped".to_string(),
            tokens_str: "0".to_string(),
            workspace_path: None,
            profile_dir: p1.to_string_lossy().to_string(),
            pid: None,
            last_used: "Never".to_string(),
            binary_path: None,
            custom_flags: None,
            env_vars: None,
            app_type: Some("antigravity".to_string()),
            blackhole_sync: Some(false),
            sync_mode: Some("solar_system".to_string()),
        },
        Instance {
            id: "i-2".to_string(),
            name: "Instance 2".to_string(),
            account_id: "acc-1".to_string(),
            mode: "auth-only".to_string(),
            port: 3002,
            status: "stopped".to_string(),
            tokens_str: "0".to_string(),
            workspace_path: None,
            profile_dir: p2.to_string_lossy().to_string(),
            pid: None,
            last_used: "Never".to_string(),
            binary_path: None,
            custom_flags: None,
            env_vars: None,
            app_type: Some("antigravity".to_string()),
            blackhole_sync: Some(false),
            sync_mode: Some("solar_system".to_string()),
        },
    ];

    let sync_res = app_lib::conversations::sync_solar_system_fleet(&group, &instances);
    assert!(sync_res.is_ok(), "sync_solar_system_fleet should succeed");

    // Verify inst2 pulled the conversation from the star brain
    let inst2_brain = p2.join(".gemini").join("antigravity").join("brain").join(conv_id);
    assert!(inst2_brain.exists(), "Instance 2 must receive the conversation via convergent brain sync");
    assert!(inst2_brain.join("data.txt").exists());

    // Verify inst2 storage has layout key
    let inst2_storage = p2.join("data").join("app_storage.json");
    assert!(inst2_storage.exists());
    let inst2_content = std::fs::read_to_string(&inst2_storage).unwrap();
    let inst2_val: serde_json::Value = serde_json::from_str(&inst2_content).unwrap();
    let layout_key = format!("antigravity-multi-conversation-layout-v3-{}", conv_id);
    assert!(inst2_val.get(&layout_key).is_some(), "Instance 2 must have layout key injected via shared storage");

    let _ = std::fs::remove_dir_all(&temp_root);
}

#[test]
fn test_transfer_copies_complete_assets_including_db_and_fts_search() {
    let temp_root = std::env::temp_dir().join(format!("bm_test_full_assets_{}", uuid::Uuid::new_v4()));
    let src_dir = temp_root.join("src_prof");
    let dest_dir = temp_root.join("dest_prof");
    let conv_id = "test-conv-complete-transfer-999";

    let src_gemini = src_dir.join(".gemini").join("antigravity");
    let src_brain = src_gemini.join("brain").join(conv_id).join(".system_generated").join("logs");
    let src_convs = src_gemini.join("conversations");
    let src_annos = src_gemini.join("annotations");

    std::fs::create_dir_all(&src_brain).unwrap();
    std::fs::create_dir_all(&src_convs).unwrap();
    std::fs::create_dir_all(&src_annos).unwrap();

    // 1. Write transcript with content "yo what is up"
    let transcript = "{\"created_at\": \"2026-10-11T12:00:00Z\", \"content\": \"yo what is up\"}\n";
    std::fs::write(src_brain.join("transcript.jsonl"), transcript).unwrap();

    // 2. Write conversation sqlite db file
    let dummy_db = src_convs.join(format!("{}.db", conv_id));
    std::fs::write(&dummy_db, b"DUMMY_SQLITE_TRAJECTORY_DATA").unwrap();

    // 3. Write annotation pbtxt file
    let dummy_anno = src_annos.join(format!("{}.pbtxt", conv_id));
    std::fs::write(&dummy_anno, "title: \"Casual Yo Conversation\"").unwrap();

    let res = app_lib::conversations::copy_conversation_to_target(
        Some(&src_dir.to_string_lossy()),
        "antigravity",
        false,
        &dest_dir.to_string_lossy(),
        "antigravity",
        conv_id,
    );
    assert!(res.is_ok(), "copy_conversation_to_target should succeed");

    let dest_gemini = dest_dir.join(".gemini").join("antigravity");
    
    // Assert 1: brain directory copied
    assert!(dest_gemini.join("brain").join(conv_id).join(".system_generated").join("logs").join("transcript.jsonl").exists());

    // Assert 2: conversations/<cid>.db copied!
    let dest_db_file = dest_gemini.join("conversations").join(format!("{}.db", conv_id));
    assert!(dest_db_file.exists(), "conversations/<cid>.db must be copied to destination");
    assert_eq!(std::fs::read(&dest_db_file).unwrap(), b"DUMMY_SQLITE_TRAJECTORY_DATA");

    // Assert 3: annotations/<cid>.pbtxt copied!
    let dest_anno_file = dest_gemini.join("annotations").join(format!("{}.pbtxt", conv_id));
    assert!(dest_anno_file.exists(), "annotations/<cid>.pbtxt must be copied to destination");

    // Assert 4: conversation_summaries.db exists with summary AND fts search table!
    let dest_db = dest_gemini.join("conversation_summaries.db");
    assert!(dest_db.exists(), "conversation_summaries.db must exist in destination");

    // Query destination SQLite database via python to verify summary and FTS search match
    let py_check = format!(
        "import sqlite3; conn = sqlite3.connect(r'{}'); row = conn.execute(\"SELECT title FROM conversation_summaries WHERE conversation_id = '{}'\").fetchone(); assert row and 'Casual Yo' in row[0], f'Row missing: {{row}}'; fts = conn.execute(\"SELECT conversation_id FROM conversations_fts WHERE conversations_fts MATCH 'Casual'\").fetchall(); assert len(fts) > 0, 'FTS search match failed'; print('VERIFIED_OK')",
        dest_db.to_string_lossy(),
        conv_id
    );
    let output = std::process::Command::new("python")
        .args(["-c", &py_check])
        .output()
        .expect("run python verification");
    assert!(output.status.success(), "SQLite and FTS search verification failed: {}", String::from_utf8_lossy(&output.stderr));

    let _ = std::fs::remove_dir_all(&temp_root);
}

#[test]
fn test_quota_reset_time_difference_formatting() {
    let now = chrono::Utc::now();
    let future_days = now + chrono::Duration::days(5) + chrono::Duration::hours(18);
    let iso = future_days.to_rfc3339();
    let formatted = app_lib::quota::format_reset_time_difference(&iso);
    assert!(formatted.contains("Resets in 5d"), "Expected 'Resets in 5d', got: {}", formatted);

    let future_hours = now + chrono::Duration::hours(1) + chrono::Duration::minutes(50);
    let iso_h = future_hours.to_rfc3339();
    let formatted_h = app_lib::quota::format_reset_time_difference(&iso_h);
    assert!(formatted_h.contains("Resets in 1h"), "Expected 'Resets in 1h', got: {}", formatted_h);

    let past = now - chrono::Duration::hours(2);
    let formatted_past = app_lib::quota::format_reset_time_difference(&past.to_rfc3339());
    assert_eq!(formatted_past, "Resetting now");
}

#[test]
fn test_antigravity_app_filtering_ignores_ide() {
    let ide_inst = Instance {
        id: "inst-ide-1".to_string(),
        name: "My IDE".to_string(),
        account_id: "acc-1".to_string(),
        mode: "auth-only".to_string(),
        port: 3001,
        status: "stopped".to_string(),
        tokens_str: "0.0M tokens".to_string(),
        workspace_path: None,
        profile_dir: "C:\\NonExistent\\IdeProfile".to_string(),
        pid: None,
        last_used: "Never".to_string(),
        binary_path: None,
        custom_flags: None,
        env_vars: None,
        app_type: Some("antigravity_ide".to_string()),
        blackhole_sync: None,
        sync_mode: None,
    };

    let list = vec![ide_inst];
    let results = app_lib::quota::fetch_all_antigravity_app_quotas(&list);
    // Ensure the IDE instance was not included (only virtual Black Hole parent if present on system)
    for res in results {
        assert_ne!(res.instance_id, "inst-ide-1", "IDE instance must be strictly excluded from quota monitor");
    }
}

#[test]
fn test_expand_path_str_userprofile() {
    let raw = "%USERPROFILE%\\AntigravityProfiles\\MyTestProfile";
    let expanded = app_lib::detector::expand_path_str(raw);
    assert!(!expanded.to_string_lossy().contains("%USERPROFILE%"), "Must expand %USERPROFILE%");
    assert!(expanded.is_absolute(), "Expanded path must be absolute");

    let raw_tilde = "~/Projects/OrbitTest";
    let expanded_tilde = app_lib::detector::expand_path_str(raw_tilde);
    assert!(!expanded_tilde.to_string_lossy().starts_with('~'), "Must expand tilde ~/");
    assert!(expanded_tilde.is_absolute(), "Expanded tilde path must be absolute");

    let raw_abs = "D:\\CustomDrive\\MyWorkspace";
    let expanded_abs = app_lib::detector::expand_path_str(raw_abs);
    assert_eq!(expanded_abs.to_string_lossy(), "D:\\CustomDrive\\MyWorkspace");
}

#[test]
fn test_profile_directory_setup_with_spaces() {
    let temp_root = std::env::temp_dir().join(format!("orbit test spaces {}", uuid::Uuid::new_v4()));
    let setup_res = app_lib::junction::setup_profile_directories(&temp_root, "auth-only");
    assert!(setup_res.is_ok(), "Profile directory setup must succeed even with spaces in path: {:?}", setup_res);

    assert!(temp_root.join("data").exists(), "data directory must exist");
    assert!(temp_root.join("extensions").exists(), "extensions junction or dir must exist");
    assert!(temp_root.join("appdata").join("Roaming").exists(), "Roaming dir must exist");
    assert!(temp_root.join("appdata").join("Local").exists(), "Local dir must exist");

    // Cleanup
    let _ = app_lib::junction::remove_junction(&temp_root.join("extensions"));
    let _ = std::fs::remove_dir_all(&temp_root);
}


