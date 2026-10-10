use std::path::Path;
use crate::detector::get_system_extensions_dir;

/// Computes the total byte size of a directory recursively.
pub fn dir_size_bytes<P: AsRef<Path>>(path: P) -> u64 {
    let mut total: u64 = 0;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_dir() {
                    total += dir_size_bytes(entry.path());
                } else {
                    total += metadata.len();
                }
            }
        }
    }
    total
}

/// Computes the total storage saved in megabytes across all auth-only instances using NTFS Junctions.
pub fn calculate_storage_saved_mb(auth_only_instance_count: usize) -> f64 {
    if auth_only_instance_count == 0 {
        return 0.0;
    }

    let ext_dir = get_system_extensions_dir();
    let ext_size_bytes = dir_size_bytes(&ext_dir);
    let ext_size_mb = if ext_size_bytes > 0 {
        ext_size_bytes as f64 / (1024.0 * 1024.0)
    } else {
        // Fallback default ~384 MB if no extensions installed yet
        384.0
    };

    // Each auth-only profile reuses this extensions directory instead of duplicating it
    let total_saved = (auth_only_instance_count as f64) * ext_size_mb;
    (total_saved * 10.0).round() / 10.0
}

/// Scans the instance profile directory to estimate telemetry / token usage metrics.
pub fn scan_profile_telemetry(profile_dir: &str) -> String {
    let path = Path::new(profile_dir);
    let data_dir = path.join("data");
    if !data_dir.exists() {
        return "0.0M tokens".to_string();
    }

    let size_bytes = dir_size_bytes(&data_dir);
    let size_mb = size_bytes as f64 / (1024.0 * 1024.0);

    // Approximate token metric from telemetry activity and logs
    if size_mb < 1.0 {
        "0.2M tokens".to_string()
    } else if size_mb < 20.0 {
        format!("{:.1}M tokens", 0.5 + (size_mb * 0.3))
    } else {
        format!("{:.1}M tokens", (size_mb * 0.15).min(95.0))
    }
}
