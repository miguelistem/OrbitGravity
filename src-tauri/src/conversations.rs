use std::path::{Path, PathBuf};
use std::process::Command;
use serde::{Deserialize, Serialize};
use crate::models::Instance;
use crate::junction::remove_junction;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversationInfo {
    pub id: String,
    pub title: String,
    pub preview: String,
    pub step_count: i64,
    pub last_modified: String,
    pub source_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SharedBrainStatus {
    pub group_name: String,
    pub is_shared: bool,
    pub member_count: usize,
    pub shared_path: Option<String>,
    pub members: Vec<String>,
}

pub const LAYOUT_PREFIX: &str = "antigravity-multi-conversation-layout-v3-";
pub const CONVERSATION_SYNC_KEYS: &[&str] = &[
    "antigravity-multi-conversation-layout-v3-index",
];
pub const FORBIDDEN_INSTANCE_STORAGE_KEYS: &[&str] = &[
    "lastCreatedProjectId",
    "new-convo-last-selected-project",
    "aux-pane-session",
    "comments",
    "sidebar_collapsed_sections",
    "sidebar_collapsed_section_headers",
    "new-convo-magic-workspace-selected",
];

/// Scans the instance profile directory to discover all valid conversation IDs that exist on disk.
pub fn get_existing_conversation_ids_for_instance(profile_dir: &str) -> std::collections::HashSet<String> {
    let mut valid_ids = std::collections::HashSet::new();
    let p = Path::new(profile_dir);

    for app_dir in &["antigravity", "antigravity-ide"] {
        let base = p.join(".gemini").join(app_dir);
        let brain = base.join("brain");
        if let Ok(entries) = std::fs::read_dir(&brain) {
            for entry in entries.flatten() {
                if entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.contains('-') {
                        valid_ids.insert(name);
                    }
                }
            }
        }
        let convs = base.join("conversations");
        if let Ok(entries) = std::fs::read_dir(&convs) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.ends_with(".db") && name.contains('-') {
                    let id = name.trim_end_matches(".db").to_string();
                    valid_ids.insert(id);
                } else if entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) && name.contains('-') {
                    valid_ids.insert(name);
                }
            }
        }
    }

    valid_ids
}

/// Sanitizes an instance's app_storage object by:
/// 1. Stripping all forbidden keys (lastCreatedProjectId, aux-pane-session, etc.)
/// 2. Removing layout keys for conversations that do NOT exist in this instance profile.
/// 3. Filtering the conversation layout index array to only existing conversations.
pub fn sanitize_instance_storage_object(
    profile_dir: &str,
    obj: &mut serde_json::Map<String, serde_json::Value>,
) {
    for k in FORBIDDEN_INSTANCE_STORAGE_KEYS {
        obj.remove(*k);
    }

    let existing_ids = get_existing_conversation_ids_for_instance(profile_dir);

    let keys_to_remove: Vec<String> = obj.keys()
        .filter(|k| {
            if let Some(cid) = k.strip_prefix(LAYOUT_PREFIX) {
                !existing_ids.contains(cid)
            } else {
                false
            }
        })
        .cloned()
        .collect();

    for k in keys_to_remove {
        obj.remove(&k);
    }

    let index_key = "antigravity-multi-conversation-layout-v3-index";
    if let Some(val) = obj.get_mut(index_key) {
        if let serde_json::Value::Array(arr) = val {
            arr.retain(|item| {
                if let Some(id_str) = item.as_str() {
                    existing_ids.contains(id_str)
                } else {
                    false
                }
            });
        } else {
            *val = serde_json::Value::Array(Vec::new());
        }
    }
}


#[cfg(windows)]
pub fn is_junction_or_symlink(path: &Path) -> bool {
    use std::os::windows::fs::MetadataExt;
    if let Ok(meta) = std::fs::symlink_metadata(path) {
        return (meta.file_attributes() & 0x400) != 0;
    }
    false
}

#[cfg(not(windows))]
pub fn is_junction_or_symlink(path: &Path) -> bool {
    if let Ok(meta) = std::fs::symlink_metadata(path) {
        return meta.file_type().is_symlink();
    }
    false
}

pub fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> std::io::Result<()> {
    std::fs::create_dir_all(&dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            std::fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

/// Resolves standard parent AppData Roaming storage locations where Antigravity stores conversation layouts.
pub fn find_parent_app_storage_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Some(roaming) = dirs::config_dir() {
        let p1 = roaming.join("Antigravity").join("app_storage.json");
        if p1.exists() {
            paths.push(p1);
        }
        let p2 = roaming.join("Antigravity IDE").join("app_storage.json");
        if p2.exists() {
            paths.push(p2);
        }
    }
    if paths.is_empty() {
        if let Some(home) = dirs::home_dir() {
            let p1 = home.join("AppData").join("Roaming").join("Antigravity").join("app_storage.json");
            if p1.exists() {
                paths.push(p1);
            }
            let p2 = home.join("AppData").join("Roaming").join("Antigravity IDE").join("app_storage.json");
            if p2.exists() {
                paths.push(p2);
            }
        }
    }
    paths
}

/// Resolves standard profile app_storage.json locations (both data and roaming dirs).
pub fn get_instance_storage_paths(profile_dir: &str) -> Vec<PathBuf> {
    let p = Path::new(profile_dir);
    vec![
        p.join("data").join("app_storage.json"),
        p.join("appdata").join("Roaming").join("Antigravity").join("app_storage.json"),
        p.join("appdata").join("Roaming").join("Antigravity IDE").join("app_storage.json"),
    ]
}

/// Extracts the layout string for a specific conversation from an instance or parent storage paths.
pub fn extract_conversation_layout_from_storage(
    profile_dir: Option<&str>,
    is_global: bool,
    conversation_id: &str,
) -> Option<String> {
    let key = format!("{}{}", LAYOUT_PREFIX, conversation_id);
    let paths = if is_global {
        find_parent_app_storage_paths()
    } else if let Some(p) = profile_dir {
        get_instance_storage_paths(p)
    } else {
        Vec::new()
    };

    for path in paths {
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(serde_json::Value::Object(map)) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(serde_json::Value::String(val)) = map.get(&key) {
                        return Some(val.clone());
                    }
                }
            }
        }
    }
    None
}

/// Injects a conversation's layout key and updates the multi-conversation layout index array.
pub fn inject_conversation_layout_to_storage(
    conversation_id: &str,
    layout_val: Option<&str>,
    storage_paths: &[PathBuf],
) {
    let layout_key = format!("{}{}", LAYOUT_PREFIX, conversation_id);
    let default_val = serde_json::json!({
        "rootNode": {
            "type": "pane",
            "id": "pane-1",
            "cascadeId": conversation_id
        },
        "focusedPaneId": "pane-1"
    }).to_string();
    let val_str = layout_val.unwrap_or(&default_val);

    for sp in storage_paths {
        if let Some(parent) = sp.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let mut obj: serde_json::Map<String, serde_json::Value> = if sp.exists() {
            if let Ok(content) = std::fs::read_to_string(sp) {
                serde_json::from_str(&content).unwrap_or_default()
            } else {
                serde_json::Map::new()
            }
        } else {
            serde_json::Map::new()
        };

        // Insert or overwrite layout key
        obj.insert(layout_key.clone(), serde_json::Value::String(val_str.to_string()));

        // Ensure in conversation index array
        let index_key = "antigravity-multi-conversation-layout-v3-index";
        let id_val = serde_json::Value::String(conversation_id.to_string());
        match obj.get_mut(index_key) {
            Some(serde_json::Value::Array(arr)) => {
                if !arr.contains(&id_val) {
                    arr.push(id_val);
                }
            }
            _ => {
                obj.insert(index_key.to_string(), serde_json::Value::Array(vec![id_val]));
            }
        }

        if let Ok(serialized) = serde_json::to_string_pretty(&serde_json::Value::Object(obj)) {
            let _ = std::fs::write(sp, serialized);
        }
    }
}

/// Merges layout and session keys from source into target without overwriting instance auth tokens.
/// Uses Set Union for conversation index arrays to prevent dropping tabs.
pub fn merge_conversation_layout_keys(
    source: &serde_json::Map<String, serde_json::Value>,
    target: &mut serde_json::Map<String, serde_json::Value>,
) -> usize {
    let mut count = 0;
    for (k, v) in source {
        if FORBIDDEN_INSTANCE_STORAGE_KEYS.contains(&k.as_str()) {
            continue;
        }
        if k == "antigravity-multi-conversation-layout-v3-index" {
            if let (Some(serde_json::Value::Array(target_arr)), serde_json::Value::Array(src_arr)) = (target.get_mut(k), v) {
                for item in src_arr {
                    if !target_arr.contains(item) {
                        target_arr.push(item.clone());
                        count += 1;
                    }
                }
            } else {
                target.insert(k.clone(), v.clone());
                count += 1;
            }
        } else if k.starts_with(LAYOUT_PREFIX) {
            if !target.contains_key(k) {
                target.insert(k.clone(), v.clone());
                count += 1;
            }
        }
    }

    // Always strip forbidden keys from target instance storage
    for k in FORBIDDEN_INSTANCE_STORAGE_KEYS {
        target.remove(*k);
    }

    count
}

/// Synchronizes parent application conversation layouts and tabs into the target profile's app_storage.json.
pub fn sync_app_storage_from_parent(profile_dir: &str) -> Result<usize, String> {
    let data_dir = PathBuf::from(profile_dir).join("data");
    let _ = std::fs::create_dir_all(&data_dir);
    let target_path = data_dir.join("app_storage.json");

    let mut target_obj: serde_json::Map<String, serde_json::Value> = if target_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&target_path) {
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            serde_json::Map::new()
        }
    } else {
        serde_json::Map::new()
    };

    let parent_paths = find_parent_app_storage_paths();
    let mut total_merged = 0;
    for pp in parent_paths {
        if let Ok(content) = std::fs::read_to_string(&pp) {
            if let Ok(serde_json::Value::Object(src_map)) = serde_json::from_str::<serde_json::Value>(&content) {
                total_merged += merge_conversation_layout_keys(&src_map, &mut target_obj);
            }
        }
    }

    // Always strip forbidden keys and phantom conversation layouts from target instance storage
    sanitize_instance_storage_object(profile_dir, &mut target_obj);

    if total_merged > 0 {
        let serialized = serde_json::to_string_pretty(&serde_json::Value::Object(target_obj))
            .map_err(|e| e.to_string())?;
        for sp in get_instance_storage_paths(profile_dir) {
            if let Some(parent) = sp.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            let _ = std::fs::write(&sp, &serialized);
        }
    }

    Ok(total_merged)
}

/// Synchronizes conversation layouts between a profile and its shared solar system brain storage.
pub fn sync_app_storage_with_solar_system(profile_dir: &str, shared_base: &Path) -> Result<usize, String> {
    let data_dir = PathBuf::from(profile_dir).join("data");
    let _ = std::fs::create_dir_all(&data_dir);
    let target_path = data_dir.join("app_storage.json");
    let shared_path = shared_base.join("shared_app_storage.json");

    let mut target_obj: serde_json::Map<String, serde_json::Value> = if target_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&target_path) {
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            serde_json::Map::new()
        }
    } else {
        serde_json::Map::new()
    };

    let mut shared_obj: serde_json::Map<String, serde_json::Value> = if shared_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&shared_path) {
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            serde_json::Map::new()
        }
    } else {
        serde_json::Map::new()
    };

    let merged = merge_conversation_layout_keys(&shared_obj, &mut target_obj);
    merge_conversation_layout_keys(&target_obj, &mut shared_obj);

    sanitize_instance_storage_object(profile_dir, &mut target_obj);

    if let Ok(serialized) = serde_json::to_string_pretty(&serde_json::Value::Object(target_obj)) {
        for sp in get_instance_storage_paths(profile_dir) {
            if let Some(parent) = sp.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            let _ = std::fs::write(&sp, &serialized);
        }
    }
    if let Ok(serialized) = serde_json::to_string_pretty(&serde_json::Value::Object(shared_obj)) {
        let _ = std::fs::write(&shared_path, serialized);
    }

    Ok(merged)
}

/// Resolves the .gemini directory path for an instance or the global user profile.
pub fn resolve_gemini_app_dir(profile_dir: Option<&str>, app_type: &str, is_global: bool) -> PathBuf {
    let sub = if app_type.contains("antigravity_ide") || app_type.contains("ide") {
        "antigravity-ide"
    } else {
        "antigravity"
    };

    if is_global {
        let home = dirs::home_dir()
            .or_else(|| std::env::var("USERPROFILE").ok().map(PathBuf::from))
            .unwrap_or_else(|| PathBuf::from("."));
        home.join(".gemini").join(sub)
    } else if let Some(p) = profile_dir {
        PathBuf::from(p).join(".gemini").join(sub)
    } else {
        PathBuf::from(".gemini").join(sub)
    }
}

/// Queries conversation records from SQLite or scans brain/ transcripts across both application variants.
pub fn list_conversations_for_source(
    profile_dir: Option<&str>,
    app_type: &str,
    is_global: bool,
    source_name: &str,
) -> Vec<ConversationInfo> {
    let gemini_base = if is_global {
        let home = dirs::home_dir()
            .or_else(|| std::env::var("USERPROFILE").ok().map(PathBuf::from))
            .unwrap_or_else(|| PathBuf::from("."));
        home.join(".gemini")
    } else if let Some(p) = profile_dir {
        PathBuf::from(p).join(".gemini")
    } else {
        PathBuf::from(".gemini")
    };

    let mut results: Vec<ConversationInfo> = Vec::new();
    let mut seen_ids = std::collections::HashSet::new();

    let sub_dirs = if app_type.contains("ide") {
        vec!["antigravity-ide", "antigravity"]
    } else {
        vec!["antigravity", "antigravity-ide"]
    };

    for sub in sub_dirs {
        let gemini_dir = gemini_base.join(sub);
        if !gemini_dir.exists() {
            continue;
        }

        let db_path = gemini_dir.join("conversation_summaries.db");

        // 1. Try querying SQLite database via python if exists
        if db_path.exists() {
            let py_script = r#"
import sqlite3, json, sys, os
db = sys.argv[1]
if not os.path.exists(db):
    print("[]")
    sys.exit(0)
try:
    conn = sqlite3.connect(db)
    rows = conn.execute("SELECT conversation_id, title, preview, step_count, last_modified_time FROM conversation_summaries ORDER BY last_modified_time DESC").fetchall()
    res = []
    for r in rows:
        res.append({
            "id": str(r[0]),
            "title": str(r[1]) if r[1] else "Conversation " + str(r[0])[:8],
            "preview": str(r[2]) if r[2] else "",
            "step_count": int(r[3]) if r[3] else 0,
            "last_modified": str(r[4]) if r[4] else ""
        })
    print(json.dumps(res))
except Exception as e:
    print("[]")
"#;
            if let Ok(output) = Command::new("python")
                .args(["-c", py_script, &db_path.to_string_lossy()])
                .output()
            {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    if let Ok(parsed) = serde_json::from_str::<Vec<serde_json::Value>>(&stdout) {
                        for item in parsed {
                            let id = item.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                            if id.is_empty() || seen_ids.contains(&id) { continue; }
                            let title = item.get("title").and_then(|v| v.as_str()).unwrap_or("Untitled").to_string();
                            let preview = item.get("preview").and_then(|v| v.as_str()).unwrap_or("").to_string();
                            let step_count = item.get("step_count").and_then(|v| v.as_i64()).unwrap_or(0);
                            let last_modified = item.get("last_modified").and_then(|v| v.as_str()).unwrap_or("").to_string();

                            seen_ids.insert(id.clone());
                            results.push(ConversationInfo {
                                id,
                                title,
                                preview,
                                step_count,
                                last_modified,
                                source_name: source_name.to_string(),
                            });
                        }
                    }
                }
            }
        }

        // 2. Scan brain/ directory for any conversation folders not yet in results
        let brain_dir = gemini_dir.join("brain");
        if brain_dir.exists() && brain_dir.is_dir() {
            if let Ok(entries) = std::fs::read_dir(&brain_dir) {
                for entry in entries.flatten() {
                    if let Ok(ft) = entry.file_type() {
                        if ft.is_dir() {
                            let conv_id = entry.file_name().to_string_lossy().to_string();
                            if !seen_ids.contains(&conv_id) && conv_id.contains('-') {
                                let mut title = format!("Session {}", &conv_id[..conv_id.len().min(8)]);
                                let mut preview = String::new();
                                let mut step_count = 0;
                                let mut last_modified = String::new();

                                let transcript_file = entry.path().join(".system_generated").join("logs").join("transcript.jsonl");
                                if transcript_file.exists() {
                                    if let Ok(content) = std::fs::read_to_string(&transcript_file) {
                                        let lines: Vec<&str> = content.lines().collect();
                                        step_count = lines.len() as i64;
                                        if let Some(first_line) = lines.first() {
                                            if let Ok(val) = serde_json::from_str::<serde_json::Value>(first_line) {
                                                if let Some(ts) = val.get("created_at").and_then(|v| v.as_str()) {
                                                    last_modified = ts.to_string();
                                                }
                                                if let Some(cnt) = val.get("content").and_then(|v| v.as_str()) {
                                                    let clean = cnt.replace("<USER_REQUEST>", "").replace("</USER_REQUEST>", "").trim().to_string();
                                                    let first_sentence = clean.lines().next().unwrap_or("").trim();
                                                    if !first_sentence.is_empty() {
                                                        title = first_sentence.chars().take(50).collect();
                                                        preview = clean.chars().take(120).collect();
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                seen_ids.insert(conv_id.clone());
                                results.push(ConversationInfo {
                                    id: conv_id,
                                    title,
                                    preview,
                                    step_count,
                                    last_modified,
                                    source_name: source_name.to_string(),
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    results
}

/// Copies all assets of a conversation (.gemini directory layout):
/// 1. brain/<cid> (logs, artifacts, chunks)
/// 2. conversations/<cid>.db (and .db-wal, .db-shm, and any subfolder)
/// 3. annotations/<cid>.pbtxt
/// 4. conversation_summaries.db (both conversation_summaries table and conversations_fts virtual table)
pub fn copy_conversation_assets(src_gemini: &Path, dest_gemini: &Path, conversation_id: &str) {
    let _ = std::fs::create_dir_all(dest_gemini);

    // 1. brain folder
    let src_brain = src_gemini.join("brain").join(conversation_id);
    if src_brain.exists() {
        let dest_brain = dest_gemini.join("brain").join(conversation_id);
        let _ = copy_dir_all(&src_brain, &dest_brain);
    }

    // 2. conversations database (.db, .db-wal, .db-shm, and any subfolder)
    let src_conv_dir = src_gemini.join("conversations");
    let dest_conv_dir = dest_gemini.join("conversations");
    let _ = std::fs::create_dir_all(&dest_conv_dir);

    for ext in &["db", "db-wal", "db-shm"] {
        let src_file = src_conv_dir.join(format!("{}.{}", conversation_id, ext));
        if src_file.exists() {
            let dest_file = dest_conv_dir.join(format!("{}.{}", conversation_id, ext));
            let _ = std::fs::copy(&src_file, &dest_file);
        }
    }

    let src_folder = src_conv_dir.join(conversation_id);
    if src_folder.is_dir() {
        let dest_folder = dest_conv_dir.join(conversation_id);
        let _ = copy_dir_all(&src_folder, &dest_folder);
    }

    // 3. annotations (.pbtxt)
    let src_anno_dir = src_gemini.join("annotations");
    let dest_anno_dir = dest_gemini.join("annotations");
    let _ = std::fs::create_dir_all(&dest_anno_dir);

    let src_anno = src_anno_dir.join(format!("{}.pbtxt", conversation_id));
    if src_anno.exists() {
        let dest_anno = dest_anno_dir.join(format!("{}.pbtxt", conversation_id));
        let _ = std::fs::copy(&src_anno, &dest_anno);
    }

    // 4. conversation_summaries & search FTS table
    upsert_sqlite_conversation(src_gemini, dest_gemini, conversation_id);
}

/// Copies a specific conversation folder, synchronizes SQLite metadata,
/// and injects the conversation layout into the destination profile's app_storage.json.
pub fn copy_conversation_to_target(
    src_profile_dir: Option<&str>,
    src_app_type: &str,
    src_is_global: bool,
    dest_profile_dir: &str,
    dest_app_type: &str,
    conversation_id: &str,
) -> Result<(), String> {
    let src_gemini = resolve_gemini_app_dir(src_profile_dir, src_app_type, src_is_global);
    let alt_src = resolve_gemini_app_dir(
        src_profile_dir,
        if src_app_type.contains("ide") { "antigravity" } else { "antigravity_ide" },
        src_is_global,
    );

    // Locate source folder where the conversation actually exists:
    let effective_src = if src_gemini.join("brain").join(conversation_id).exists()
        || src_gemini.join("conversations").join(format!("{}.db", conversation_id)).exists() {
        src_gemini
    } else if alt_src.join("brain").join(conversation_id).exists()
        || alt_src.join("conversations").join(format!("{}.db", conversation_id)).exists() {
        alt_src
    } else {
        // Fallback: search global .gemini if not found in instance
        let global_gemini = dirs::home_dir()
            .or_else(|| std::env::var("USERPROFILE").ok().map(PathBuf::from))
            .unwrap_or_else(|| PathBuf::from("."))
            .join(".gemini");
        let g_sub = global_gemini.join(if src_app_type.contains("ide") { "antigravity-ide" } else { "antigravity" });
        if g_sub.join("brain").join(conversation_id).exists() || g_sub.join("conversations").join(format!("{}.db", conversation_id)).exists() {
            g_sub
        } else {
            src_gemini
        }
    };

    let dest_gemini = resolve_gemini_app_dir(Some(dest_profile_dir), dest_app_type, false);
    let alt_dest = resolve_gemini_app_dir(
        Some(dest_profile_dir),
        if dest_app_type.contains("ide") { "antigravity" } else { "antigravity_ide" },
        false,
    );

    // Copy full conversation assets to both target app variants so it's always accessible
    for target_dir in &[&dest_gemini, &alt_dest] {
        copy_conversation_assets(&effective_src, target_dir, conversation_id);
    }

    // Extract layout from source storage and inject into target profile storage
    let layout_val = extract_conversation_layout_from_storage(src_profile_dir, src_is_global, conversation_id);
    let dest_storage_paths = get_instance_storage_paths(dest_profile_dir);
    inject_conversation_layout_to_storage(conversation_id, layout_val.as_deref(), &dest_storage_paths);

    Ok(())
}

/// Extracts step count and timestamp from conversation transcript.
pub fn get_conversation_step_count(conv_dir: &Path) -> (i64, String) {
    let transcript = conv_dir.join(".system_generated").join("logs").join("transcript.jsonl");
    if transcript.exists() {
        if let Ok(content) = std::fs::read_to_string(&transcript) {
            let lines: Vec<&str> = content.lines().filter(|l| !l.trim().is_empty()).collect();
            let count = lines.len() as i64;
            let mut ts = String::new();
            if let Some(first) = lines.first() {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(first) {
                    if let Some(t) = val.get("created_at").and_then(|v| v.as_str()) {
                        ts = t.to_string();
                    }
                }
            }
            return (count, ts);
        }
    }
    (0, String::new())
}

/// Safely upserts SQLite conversation record, ensuring both `conversation_summaries`
/// and full-text search `conversations_fts` are created and synchronized.
pub fn upsert_sqlite_conversation(src_path: &Path, dest_path: &Path, conversation_id: &str) {
    let src_dir = if src_path.is_file() {
        src_path.parent().unwrap_or(src_path)
    } else {
        src_path
    };
    let dest_dir = if dest_path.is_file() {
        dest_path.parent().unwrap_or(dest_path)
    } else {
        dest_path
    };

    if let Some(parent) = dest_dir.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::create_dir_all(dest_dir);

    let py_sync = r#"
import sqlite3, sys, os, re, json, time

src_dir, dest_dir, cid = sys.argv[1], sys.argv[2], sys.argv[3]
src_db = os.path.join(src_dir, "conversation_summaries.db")
dest_db = os.path.join(dest_dir, "conversation_summaries.db")

try:
    os.makedirs(dest_dir, exist_ok=True)
    conn_dest = sqlite3.connect(dest_db, timeout=10.0)

    conn_dest.execute('''CREATE TABLE IF NOT EXISTS `conversation_summaries` (
        `conversation_id` text,
        `title` text NOT NULL DEFAULT "",
        `preview` text NOT NULL DEFAULT "",
        `step_count` integer NOT NULL DEFAULT 0,
        `last_modified_time` datetime NOT NULL,
        `workspace_uris` text NOT NULL,
        `status` text NOT NULL DEFAULT "",
        `source` text NOT NULL DEFAULT "",
        `project_id` text NOT NULL DEFAULT "",
        `agent_name` text NOT NULL DEFAULT "",
        `parent_conversation_id` text NOT NULL DEFAULT "",
        `nesting_depth` integer NOT NULL DEFAULT 0,
        `battle_id` text NOT NULL DEFAULT "",
        `winning_conversation_id` text NOT NULL DEFAULT "",
        `not_fully_idle` numeric NOT NULL DEFAULT false,
        `killed` numeric NOT NULL DEFAULT false,
        `last_user_input_time` datetime NOT NULL,
        `last_user_input_step_index` integer NOT NULL DEFAULT -1,
        `app_data_dir` text NOT NULL DEFAULT "",
        `raw_summary` blob,
        `group_id` text NOT NULL DEFAULT "",
        PRIMARY KEY (`conversation_id`)
    )''')

    conn_dest.execute("CREATE TABLE IF NOT EXISTS search_schema_version (version INTEGER PRIMARY KEY)")
    if not conn_dest.execute("SELECT 1 FROM search_schema_version").fetchone():
        conn_dest.execute("INSERT OR IGNORE INTO search_schema_version VALUES (3)")

    conn_dest.execute('''CREATE VIRTUAL TABLE IF NOT EXISTS conversations_fts USING fts5(
        conversation_id UNINDEXED,
        chunk_index UNINDEXED,
        chunk_first_step UNINDEXED,
        chunk_last_step UNINDEXED,
        last_modified_time UNINDEXED,
        step_count UNINDEXED,
        last_step_created_at UNINDEXED,
        archived UNINDEXED,
        user_step_byte_offsets UNINDEXED,
        agent_step_byte_offsets UNINDEXED,
        title,
        workspace,
        project,
        user_body,
        agent_body,
        tokenize = 'unicode61 remove_diacritics 2',
        prefix = '1 2 3'
    )''')

    has_summary = False

    if os.path.exists(src_db):
        try:
            src_db_clean = src_db.replace('\\', '/')
            conn_dest.execute(f"ATTACH DATABASE 'file:{src_db_clean}?mode=ro' AS src_db")
            row = conn_dest.execute("SELECT * FROM src_db.conversation_summaries WHERE conversation_id = ?", (cid,)).fetchone()
            if row:
                conn_dest.execute("INSERT OR REPLACE INTO conversation_summaries SELECT * FROM src_db.conversation_summaries WHERE conversation_id = ?", (cid,))
                has_summary = True
            try:
                fts_rows = conn_dest.execute("SELECT * FROM src_db.conversations_fts WHERE conversation_id = ?", (cid,)).fetchall()
                if fts_rows and len(fts_rows) > 0:
                    conn_dest.execute("DELETE FROM conversations_fts WHERE conversation_id = ?", (cid,))
                    conn_dest.execute("INSERT INTO conversations_fts SELECT * FROM src_db.conversations_fts WHERE conversation_id = ?", (cid,))
            except Exception:
                pass
            conn_dest.execute("DETACH DATABASE src_db")
        except Exception:
            pass

    curr_fts_count = conn_dest.execute("SELECT count(*) FROM conversations_fts WHERE conversation_id = ?", (cid,)).fetchone()[0]
    if curr_fts_count == 0:
        title = ""
        preview = ""
        user_body = ""
        agent_body = ""
        step_count = 0
        now_ns = int(time.time() * 1e9)
        created_at = "2026-10-11 12:00:00.000000+00:00"
        workspace = ""
        project = ""

        sum_row = conn_dest.execute("SELECT title, preview, step_count, workspace_uris, project_id, last_modified_time FROM conversation_summaries WHERE conversation_id = ?", (cid,)).fetchone()
        if sum_row:
            if sum_row[0]: title = sum_row[0]
            if sum_row[1]: preview = sum_row[1]
            if sum_row[2]: step_count = sum_row[2]
            if sum_row[3]:
                try:
                    w_list = json.loads(sum_row[3])
                    if w_list and len(w_list) > 0:
                        workspace = os.path.basename(w_list[0].rstrip('/\\'))
                        project = workspace
                except Exception:
                    pass
            if sum_row[4] and not project:
                project = sum_row[4]

        if not title:
            for d in [src_dir, dest_dir]:
                anno = os.path.join(d, "annotations", f"{cid}.pbtxt")
                if os.path.exists(anno):
                    try:
                        content = open(anno, encoding="utf-8", errors="ignore").read()
                        m = re.search(r'title:\s*"([^"]+)"', content)
                        if m:
                            title = m.group(1).strip()
                            break
                    except Exception:
                        pass

        for d in [src_dir, dest_dir]:
            t_file = os.path.join(d, "brain", cid, ".system_generated", "logs", "transcript.jsonl")
            if os.path.exists(t_file):
                try:
                    lines = [l.strip() for l in open(t_file, encoding="utf-8", errors="ignore") if l.strip()]
                    step_count = max(step_count, len(lines))
                    u_texts = []
                    a_texts = []
                    for l in lines:
                        try:
                            val = json.loads(l)
                            if "created_at" in val and created_at == "2026-10-11 12:00:00.000000+00:00":
                                created_at = val["created_at"]
                            cnt = val.get("content", "")
                            clean = re.sub(r"<[^>]+>", "", cnt).strip()
                            stype = val.get("type", "")
                            src_type = val.get("source", "")
                            if "USER" in stype or "USER" in src_type or "<USER_REQUEST>" in cnt:
                                if clean:
                                    u_texts.append(clean)
                                    if not title:
                                        title = clean.split("\n")[0][:60]
                                    if not preview:
                                        preview = clean[:120]
                            elif "PLANNER" in stype or "MODEL" in src_type or stype == "DONE":
                                if clean:
                                    a_texts.append(clean[:500])
                        except Exception:
                            pass
                    if u_texts:
                        user_body = "\n".join(u_texts)
                    if a_texts:
                        agent_body = "\n".join(a_texts[:10])
                    break
                except Exception:
                    pass

        if not title:
            title = f"Conversation {cid[:8]}"
        if not preview:
            preview = title

        if not has_summary:
            conn_dest.execute('''INSERT OR REPLACE INTO conversation_summaries (
                conversation_id, title, preview, step_count, last_modified_time,
                workspace_uris, status, last_user_input_time, app_data_dir
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''', (
                cid, title, preview, step_count, created_at,
                "[]", "CASCADE_RUN_STATUS_IDLE", created_at, "antigravity"
            ))

        conn_dest.execute("DELETE FROM conversations_fts WHERE conversation_id = ?", (cid,))
        conn_dest.execute('''INSERT INTO conversations_fts (
            conversation_id, chunk_index, chunk_first_step, chunk_last_step,
            last_modified_time, step_count, last_step_created_at, archived,
            user_step_byte_offsets, agent_step_byte_offsets,
            title, workspace, project, user_body, agent_body
        ) VALUES (?, -1, 0, 0, ?, ?, ?, 0, "", "", ?, ?, ?, "", "")''', (
            cid, now_ns, step_count, now_ns, title, workspace, project
        ))

        conn_dest.execute('''INSERT INTO conversations_fts (
            conversation_id, chunk_index, chunk_first_step, chunk_last_step,
            last_modified_time, step_count, last_step_created_at, archived,
            user_step_byte_offsets, agent_step_byte_offsets,
            title, workspace, project, user_body, agent_body
        ) VALUES (?, 0, 0, ?, 0, 0, 0, 0, "", "", "", "", "", ?, ?)''', (
            cid, max(1, step_count - 1), user_body, agent_body or title
        ))

    conn_dest.commit()
    conn_dest.close()
except Exception:
    pass
"#;

    let _ = Command::new("python")
        .args(["-c", py_sync, &src_dir.to_string_lossy(), &dest_dir.to_string_lossy(), conversation_id])
        .output();
}

#[derive(Debug, Default, Clone)]
pub struct AtomicSyncReport {
    pub pulled: usize,
    pub pushed: usize,
    pub updated_master: usize,
    pub updated_local: usize,
}

/// Atomically synchronizes a pair of .gemini subfolders without deleting data or causing rollbacks.
pub fn atomic_sync_gemini_pair(local_dir: &Path, master_dir: &Path) -> Result<AtomicSyncReport, String> {
    let mut report = AtomicSyncReport::default();
    let _ = std::fs::create_dir_all(local_dir);
    let _ = std::fs::create_dir_all(master_dir);

    let local_brain = local_dir.join("brain");
    let master_brain = master_dir.join("brain");
    let _ = std::fs::create_dir_all(&local_brain);
    let _ = std::fs::create_dir_all(&master_brain);

    let mut all_cids = std::collections::HashSet::new();

    for dir in &[local_dir, master_dir] {
        let brain = dir.join("brain");
        if let Ok(entries) = std::fs::read_dir(&brain) {
            for entry in entries.flatten() {
                if entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.contains('-') {
                        all_cids.insert(name);
                    }
                }
            }
        }

        let convs = dir.join("conversations");
        if let Ok(entries) = std::fs::read_dir(&convs) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.ends_with(".db") && name.contains('-') {
                    let id = name.trim_end_matches(".db").to_string();
                    all_cids.insert(id);
                } else if entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) && name.contains('-') {
                    all_cids.insert(name);
                }
            }
        }
    }

    for cid in all_cids {
        let loc_has_brain = local_brain.join(&cid).exists();
        let loc_has_db = local_dir.join("conversations").join(format!("{}.db", cid)).exists();
        let mst_has_brain = master_brain.join(&cid).exists();
        let mst_has_db = master_dir.join("conversations").join(format!("{}.db", cid)).exists();

        let loc_exists = loc_has_brain || loc_has_db;
        let mst_exists = mst_has_brain || mst_has_db;

        if mst_exists && !loc_exists {
            // Master has it, Local does not -> Pull to Local
            copy_conversation_assets(master_dir, local_dir, &cid);
            report.pulled += 1;
        } else if loc_exists && !mst_exists {
            // Local has it, Master does not -> Push to Master
            copy_conversation_assets(local_dir, master_dir, &cid);
            report.pushed += 1;
        } else if loc_exists && mst_exists {
            // Both exist -> Compare step count (Anti-rollback rule)
            let (loc_steps, _) = get_conversation_step_count(&local_brain.join(&cid));
            let (mst_steps, _) = get_conversation_step_count(&master_brain.join(&cid));

            if loc_steps > mst_steps {
                // Local is forward (e.g. 27 steps > 25 steps) -> Upgrade Master
                copy_conversation_assets(local_dir, master_dir, &cid);
                report.updated_master += 1;
            } else if mst_steps > loc_steps {
                // Master is newer (e.g. 25 steps > 5 steps) -> Anti-rollback: Master untouched, Local caught up
                copy_conversation_assets(master_dir, local_dir, &cid);
                report.updated_local += 1;
            } else {
                // Equal steps: ensure all files (.db, .pbtxt, summaries) exist on both sides
                if mst_has_db && !loc_has_db {
                    copy_conversation_assets(master_dir, local_dir, &cid);
                } else if loc_has_db && !mst_has_db {
                    copy_conversation_assets(local_dir, master_dir, &cid);
                } else {
                    upsert_sqlite_conversation(master_dir, local_dir, &cid);
                    upsert_sqlite_conversation(local_dir, master_dir, &cid);
                }
            }
        }
    }

    Ok(report)
}

/// Synchronizes app_storage.json conversation layout keys bidirectionally via Set Union.
pub fn sync_app_storage_bidirectional(profile_dir: &str, master_paths: &[PathBuf]) -> Result<(), String> {
    let data_dir = PathBuf::from(profile_dir).join("data");
    let _ = std::fs::create_dir_all(&data_dir);
    let inst_path = data_dir.join("app_storage.json");

    let mut inst_obj: serde_json::Map<String, serde_json::Value> = if inst_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&inst_path) {
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            serde_json::Map::new()
        }
    } else {
        serde_json::Map::new()
    };

    for mp in master_paths {
        if let Some(parent) = mp.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let mut master_obj: serde_json::Map<String, serde_json::Value> = if mp.exists() {
            if let Ok(content) = std::fs::read_to_string(mp) {
                serde_json::from_str(&content).unwrap_or_default()
            } else {
                serde_json::Map::new()
            }
        } else {
            serde_json::Map::new()
        };

        merge_conversation_layout_keys(&master_obj, &mut inst_obj);
        merge_conversation_layout_keys(&inst_obj, &mut master_obj);

        if let Ok(ser) = serde_json::to_string_pretty(&serde_json::Value::Object(master_obj)) {
            let _ = std::fs::write(mp, ser);
        }
    }

    // Strip forbidden foreign keys and phantom conversation layouts from instance storage
    sanitize_instance_storage_object(profile_dir, &mut inst_obj);

    if let Ok(ser) = serde_json::to_string_pretty(&serde_json::Value::Object(inst_obj)) {
        for sp in get_instance_storage_paths(profile_dir) {
            if let Some(parent) = sp.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            let _ = std::fs::write(&sp, &ser);
        }
    }

    Ok(())
}

/// Base directory for category group shared brains (%USERPROFILE%\AntigravityProfiles\_shared_brains).
pub fn get_shared_brains_base_dir() -> PathBuf {
    let base = dirs::home_dir()
        .or_else(|| std::env::var("USERPROFILE").ok().map(PathBuf::from))
        .unwrap_or_else(|| PathBuf::from("."))
        .join("AntigravityProfiles")
        .join("_shared_brains");
    let _ = std::fs::create_dir_all(&base);
    base
}

/// Synchronizes an instance with its master brain (Black Hole or Solar System Star Brain).
/// Enforces local runtime isolation, additive-only merging, and anti-rollback rules.
pub fn sync_instance_with_master_brain(instance: &Instance) -> Result<String, String> {
    let raw_mode = instance.sync_mode.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty());
    let mode = raw_mode.unwrap_or_else(|| {
        if instance.blackhole_sync == Some(true) {
            "black_hole"
        } else {
            "solar_system"
        }
    });

    let home = dirs::home_dir()
        .or_else(|| std::env::var("USERPROFILE").ok().map(PathBuf::from))
        .unwrap_or_else(|| PathBuf::from("."));

    let inst_gemini = PathBuf::from(&instance.profile_dir).join(".gemini");
    let _ = std::fs::create_dir_all(&inst_gemini);

    match mode {
        "black_hole" => {
            let global_gemini = home.join(".gemini");
            let mut total_pulled = 0;
            let mut total_pushed = 0;
            let mut total_updated = 0;

            for sub in &["antigravity", "antigravity-ide"] {
                let inst_sub = inst_gemini.join(sub);
                let global_sub = global_gemini.join(sub);

                // Decouple any raw junctions so profile is an isolated sandbox
                if inst_sub.exists() && is_junction_or_symlink(&inst_sub) {
                    let _ = remove_junction(&inst_sub);
                    let _ = std::fs::create_dir_all(&inst_sub);
                    if global_sub.exists() {
                        let _ = copy_dir_all(&global_sub, &inst_sub);
                    }
                }

                let report = atomic_sync_gemini_pair(&inst_sub, &global_sub)?;
                total_pulled += report.pulled;
                total_pushed += report.pushed;
                total_updated += report.updated_master + report.updated_local;
            }

            let _ = sync_app_storage_bidirectional(&instance.profile_dir, &find_parent_app_storage_paths());

            Ok(format!(
                "Black Hole synchronized: {} pulled, {} pushed, {} updated (Zero deletions)",
                total_pulled, total_pushed, total_updated
            ))
        }
        "solar_system" => {
            let mut group_key = "General".to_string();
            if let Some(parent) = Path::new(&instance.profile_dir).parent() {
                let parent_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if parent_name.to_lowercase() != "antigravityprofiles" && !parent_name.is_empty() {
                    group_key = parent_name.to_string();
                }
            }
            let clean_slug: String = group_key.chars()
                .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
                .collect();
            let slug = if clean_slug.is_empty() { "default".to_string() } else { clean_slug };
            let shared_base = get_shared_brains_base_dir().join(&slug);

            let mut total_pulled = 0;
            let mut total_pushed = 0;
            let mut total_updated = 0;

            for sub in &["antigravity", "antigravity-ide"] {
                let inst_sub = inst_gemini.join(sub);
                let shared_sub = shared_base.join(sub);

                // Decouple any raw junctions so profile is an isolated sandbox
                if inst_sub.exists() && is_junction_or_symlink(&inst_sub) {
                    let _ = remove_junction(&inst_sub);
                    let _ = std::fs::create_dir_all(&inst_sub);
                    if shared_sub.exists() {
                        let _ = copy_dir_all(&shared_sub, &inst_sub);
                    }
                }

                let report = atomic_sync_gemini_pair(&inst_sub, &shared_sub)?;
                total_pulled += report.pulled;
                total_pushed += report.pushed;
                total_updated += report.updated_master + report.updated_local;
            }

            let shared_storage_path = shared_base.join("shared_app_storage.json");
            let _ = sync_app_storage_bidirectional(&instance.profile_dir, &[shared_storage_path]);

            Ok(format!(
                "Solar System '{}' synchronized: {} pulled, {} pushed, {} updated",
                group_key, total_pulled, total_pushed, total_updated
            ))
        }
        _ => {
            Ok("Solo instance: conversation memory is private and isolated.".to_string())
        }
    }
}

/// Attaches an instance directly to the Black Hole (ensures decoupled directory & syncs memory).
pub fn attach_instance_to_blackhole(instance: &Instance) -> Result<(), String> {
    let inst_gemini = PathBuf::from(&instance.profile_dir).join(".gemini");
    let _ = std::fs::create_dir_all(&inst_gemini);

    for sub in &["antigravity", "antigravity-ide"] {
        let inst_sub = inst_gemini.join(sub);
        if inst_sub.exists() && is_junction_or_symlink(&inst_sub) {
            let _ = remove_junction(&inst_sub);
        }
        let _ = std::fs::create_dir_all(&inst_sub);
    }

    let _ = sync_instance_with_master_brain(instance)?;
    Ok(())
}

/// Detaches an instance from the Black Hole, reverting to private local storage.
pub fn detach_instance_from_blackhole(instance: &Instance) -> Result<(), String> {
    let inst_gemini = PathBuf::from(&instance.profile_dir).join(".gemini");

    for sub in &["antigravity", "antigravity-ide"] {
        let inst_sub = inst_gemini.join(sub);
        if inst_sub.exists() && is_junction_or_symlink(&inst_sub) {
            let _ = remove_junction(&inst_sub);
            let _ = std::fs::create_dir_all(&inst_sub);
        }
    }
    Ok(())
}

/// Performs synchronization every time an instance session is started/launched (pre-flight pull).
pub fn sync_instance_on_session_start(instance: &Instance) -> Result<(), String> {
    let _ = sync_instance_with_master_brain(instance)?;
    Ok(())
}

/// Updates shared storage when an instance terminates (post-flight push).
pub fn sync_instance_on_session_stop(instance: &Instance) -> Result<(), String> {
    let _ = sync_instance_with_master_brain(instance)?;
    Ok(())
}

/// Fully synchronizes an entire Solar System brain group across all member instances
/// using a 2-pass convergent synchronization protocol so all instances receive new/transferred conversations.
pub fn sync_solar_system_fleet(group_name: &str, all_instances: &[Instance]) -> Result<String, String> {
    let clean_slug: String = group_name.chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    let slug = if clean_slug.is_empty() { "default".to_string() } else { clean_slug };
    let shared_base = get_shared_brains_base_dir().join(&slug);
    let _ = std::fs::create_dir_all(&shared_base);

    // Find all member instances in this Solar System (non-solo, non-black-hole)
    let members: Vec<&Instance> = all_instances.iter()
        .filter(|inst| {
            let is_bh = inst.blackhole_sync == Some(true) || inst.sync_mode.as_deref() == Some("black_hole");
            let is_solo = inst.sync_mode.as_deref() == Some("solo");
            if is_bh || is_solo { return false; }

            let mut g = "General".to_string();
            if let Some(parent) = Path::new(&inst.profile_dir).parent() {
                let p_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if p_name.to_lowercase() != "antigravityprofiles" && !p_name.is_empty() {
                    g = p_name.to_string();
                }
            }
            g.eq_ignore_ascii_case(group_name)
        })
        .collect();

    if members.is_empty() {
        return Ok(format!("Solar System '{}' has no registered members.", group_name));
    }

    // Pass 1: Every member syncs with shared_base (pushes their local conversations to Star Brain)
    for m in &members {
        let _ = sync_instance_with_master_brain(m);
    }

    // Pass 2: Every member syncs with shared_base again (pulls everything contributed by peers)
    for m in &members {
        let _ = sync_instance_with_master_brain(m);
    }

    Ok(format!(
        "Solar System '{}' fully synchronized across all {} instances.",
        group_name, members.len()
    ))
}

/// Synchronizes all Black Hole tethered instances with the master Black Hole brain.
pub fn sync_black_hole_fleet(all_instances: &[Instance]) -> Result<String, String> {
    let tethered: Vec<&Instance> = all_instances.iter()
        .filter(|inst| inst.blackhole_sync == Some(true) || inst.sync_mode.as_deref() == Some("black_hole"))
        .collect();

    for inst in &tethered {
        let _ = sync_instance_with_master_brain(inst);
    }

    Ok(format!("The Black Hole synchronized across {} tethered instance(s).", tethered.len()))
}

/// Synchronizes conversation memory for all instances across all solar systems and the black hole.
pub fn sync_all_shared_brains(instances: &[Instance]) -> Result<(), String> {
    let mut groups = std::collections::HashSet::new();
    for inst in instances {
        let is_bh = inst.blackhole_sync == Some(true) || inst.sync_mode.as_deref() == Some("black_hole");
        let is_solo = inst.sync_mode.as_deref() == Some("solo");
        if !is_bh && !is_solo {
            let mut g = "General".to_string();
            if let Some(parent) = Path::new(&inst.profile_dir).parent() {
                let p_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if p_name.to_lowercase() != "antigravityprofiles" && !p_name.is_empty() {
                    g = p_name.to_string();
                }
            }
            groups.insert(g);
        }
    }

    for g in groups {
        let _ = sync_solar_system_fleet(&g, instances);
    }

    let _ = sync_black_hole_fleet(instances);
    Ok(())
}

/// Retrieves the shared brain status for a specific instance.
pub fn get_instance_shared_brain_status(instance: &Instance, all_instances: &[Instance]) -> SharedBrainStatus {
    if instance.blackhole_sync == Some(true) || instance.sync_mode.as_deref() == Some("black_hole") {
        let global_path = dirs::home_dir()
            .map(|h| h.join(".gemini").to_string_lossy().to_string())
            .unwrap_or_else(|| "%USERPROFILE%\\.gemini".to_string());
        return SharedBrainStatus {
            group_name: "The Black Hole (Parent Singularity)".to_string(),
            is_shared: true,
            member_count: 1,
            shared_path: Some(global_path),
            members: vec!["Parent Antigravity Root".to_string(), instance.name.clone()],
        };
    }

    if instance.sync_mode.as_deref() == Some("solo") {
        return SharedBrainStatus {
            group_name: "Solo System Orbit".to_string(),
            is_shared: false,
            member_count: 1,
            shared_path: None,
            members: vec![instance.name.clone()],
        };
    }

    let mut group_key = "General".to_string();
    if let Some(parent) = Path::new(&instance.profile_dir).parent() {
        let parent_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if parent_name.to_lowercase() != "antigravityprofiles" && !parent_name.is_empty() {
            group_key = parent_name.to_string();
        }
    }

    let members: Vec<String> = all_instances.iter()
        .filter(|i| {
            if i.blackhole_sync == Some(true) || i.sync_mode.as_deref() == Some("black_hole") || i.sync_mode.as_deref() == Some("solo") {
                return false;
            }
            let mut i_group = "General".to_string();
            if let Some(parent) = Path::new(&i.profile_dir).parent() {
                let parent_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if parent_name.to_lowercase() != "antigravityprofiles" && !parent_name.is_empty() {
                    i_group = parent_name.to_string();
                }
            }
            i_group.to_lowercase() == group_key.to_lowercase()
        })
        .map(|i| i.name.clone())
        .collect();

    let count = members.len();
    let is_shared = count >= 2;
    let shared_path = if is_shared {
        let slug: String = group_key.chars().filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_').collect();
        Some(get_shared_brains_base_dir().join(&slug).to_string_lossy().to_string())
    } else {
        None
    };

    SharedBrainStatus {
        group_name: group_key,
        is_shared,
        member_count: count,
        shared_path,
        members,
    }
}

/// Purges a conversation from a given .gemini directory (removes brain/, conversations/, and SQLite record).
pub fn purge_conversation_from_gemini_dir(gemini_dir: &Path, conversation_id: &str) -> bool {
    let mut modified = false;

    let brain_dir = gemini_dir.join("brain").join(conversation_id);
    if brain_dir.exists() {
        let _ = std::fs::remove_dir_all(&brain_dir);
        modified = true;
    }

    let conv_dir = gemini_dir.join("conversations");
    for ext in &["db", "db-wal", "db-shm"] {
        let f = conv_dir.join(format!("{}.{}", conversation_id, ext));
        if f.exists() {
            let _ = std::fs::remove_file(&f);
            modified = true;
        }
    }
    let meta_dir = conv_dir.join(conversation_id);
    if meta_dir.exists() {
        let _ = std::fs::remove_dir_all(&meta_dir);
        modified = true;
    }

    let anno_file = gemini_dir.join("annotations").join(format!("{}.pbtxt", conversation_id));
    if anno_file.exists() {
        let _ = std::fs::remove_file(&anno_file);
        modified = true;
    }

    let db_path = gemini_dir.join("conversation_summaries.db");
    if db_path.exists() {
        let py_del = r#"
import sqlite3, sys, os
db, cid = sys.argv[1], sys.argv[2]
try:
    if os.path.exists(db):
        conn = sqlite3.connect(db)
        conn.execute("DELETE FROM conversation_summaries WHERE conversation_id = ?", (cid,))
        try:
            conn.execute("DELETE FROM conversations_fts WHERE conversation_id = ?", (cid,))
        except Exception:
            pass
        conn.commit()
        conn.close()
except Exception:
    pass
"#;
        let _ = std::process::Command::new("python")
            .args(["-c", py_del, &db_path.to_string_lossy(), conversation_id])
            .output();
        modified = true;
    }

    modified
}

/// Removes layout references to a conversation from app_storage.json.
pub fn purge_conversation_from_app_storage(storage_path: &Path, conversation_id: &str) {
    if !storage_path.exists() {
        return;
    }

    if let Ok(content) = std::fs::read_to_string(storage_path) {
        if let Ok(mut json_val) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(obj) = json_val.as_object_mut() {
                let keys_to_remove: Vec<String> = obj.keys()
                    .filter(|k| k.contains(conversation_id))
                    .cloned()
                    .collect();

                for k in keys_to_remove {
                    obj.remove(&k);
                }

                if let Some(idx_val) = obj.get_mut("antigravity-multi-conversation-layout-v3-index") {
                    if let Some(idx_str) = idx_val.as_str() {
                        if let Ok(mut items) = serde_json::from_str::<Vec<serde_json::Value>>(idx_str) {
                            items.retain(|item| {
                                item.get("conversationId").and_then(|v| v.as_str()) != Some(conversation_id)
                            });
                            if let Ok(new_idx_str) = serde_json::to_string(&items) {
                                *idx_val = serde_json::Value::String(new_idx_str);
                            }
                        }
                    }
                }

                if let Ok(ser) = serde_json::to_string_pretty(&serde_json::Value::Object(obj.clone())) {
                    let _ = std::fs::write(storage_path, ser);
                }
            }
        }
    }
}

/// Deletes a conversation from an instance sandbox or master/shared brain before synchronization.
pub fn delete_conversation_record(
    profile_dir: Option<&str>,
    _app_type: Option<&str>,
    is_global: bool,
    conversation_id: &str,
    delete_from_shared_brain: bool,
) -> Result<bool, String> {
    if is_global {
        let home = dirs::home_dir()
            .or_else(|| std::env::var("USERPROFILE").ok().map(PathBuf::from))
            .unwrap_or_else(|| PathBuf::from("."));

        for sub in &["antigravity", "antigravity-ide"] {
            let g_sub = home.join(".gemini").join(sub);
            purge_conversation_from_gemini_dir(&g_sub, conversation_id);
        }

        for p in find_parent_app_storage_paths() {
            purge_conversation_from_app_storage(&p, conversation_id);
        }
        return Ok(true);
    }

    let p_dir = profile_dir.ok_or_else(|| "Profile directory is required to delete an instance conversation".to_string())?;
    let inst_gemini = PathBuf::from(p_dir).join(".gemini");

    for sub in &["antigravity", "antigravity-ide"] {
        let inst_sub = inst_gemini.join(sub);
        purge_conversation_from_gemini_dir(&inst_sub, conversation_id);
    }

    for sp in get_instance_storage_paths(p_dir) {
        purge_conversation_from_app_storage(&sp, conversation_id);
    }

    // If requested, also purge from the category's shared brain
    if delete_from_shared_brain {
        let mut group_key = "General".to_string();
        if let Some(parent) = Path::new(p_dir).parent() {
            let parent_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if parent_name.to_lowercase() != "antigravityprofiles" && !parent_name.is_empty() {
                group_key = parent_name.to_string();
            }
        }
        let clean_slug: String = group_key.chars()
            .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
            .collect();
        let slug = if clean_slug.is_empty() { "default".to_string() } else { clean_slug };
        let shared_base = get_shared_brains_base_dir().join(&slug);

        for sub in &["antigravity", "antigravity-ide"] {
            let shared_sub = shared_base.join(sub);
            purge_conversation_from_gemini_dir(&shared_sub, conversation_id);
        }
        let shared_storage = shared_base.join("shared_app_storage.json");
        purge_conversation_from_app_storage(&shared_storage, conversation_id);
    }

    Ok(true)
}

