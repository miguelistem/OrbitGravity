use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub email: String,
    pub tier: String,
    #[serde(alias = "apiKeyPreview")]
    pub api_key_preview: String,
    #[serde(alias = "tokensUsedM")]
    pub tokens_used_m: f64,
    #[serde(alias = "tokensMaxM")]
    pub tokens_max_m: f64,
    #[serde(alias = "resetsIn")]
    pub resets_in: String,
    #[serde(alias = "rpmCurrent")]
    pub rpm_current: u32,
    #[serde(alias = "rpmMax")]
    pub rpm_max: u32,
    #[serde(alias = "dailySpend")]
    pub daily_spend: f64,
    #[serde(alias = "dailyCap")]
    pub daily_cap: f64,
    #[serde(alias = "activeIdes")]
    pub active_ides: u32,
    #[serde(alias = "maxIdes")]
    pub max_ides: u32,
    #[serde(alias = "instancesLinked")]
    pub instances_linked: u32,
    pub status: String, // 'active' | 'warning'
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Instance {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub tag: Option<String>,
    #[serde(alias = "accountId")]
    pub account_id: String,
    pub mode: String, // 'auth-only' | 'full'
    pub port: u16,
    pub status: String, // 'running' | 'stopped'
    #[serde(alias = "tokensStr")]
    pub tokens_str: String,
    #[serde(alias = "workspacePath")]
    pub workspace_path: Option<String>,
    #[serde(alias = "profileDir")]
    pub profile_dir: String,
    pub pid: Option<u32>,
    #[serde(default, alias = "lastUsed")]
    pub last_used: String,
    #[serde(default, alias = "binaryPath")]
    pub binary_path: Option<String>,
    #[serde(default, alias = "customFlags")]
    pub custom_flags: Option<String>,
    #[serde(default, alias = "envVars")]
    pub env_vars: Option<std::collections::HashMap<String, String>>,
    #[serde(default, alias = "appType")]
    pub app_type: Option<String>,
    #[serde(default, alias = "blackholeSync")]
    pub blackhole_sync: Option<bool>,
    #[serde(default, alias = "syncMode")]
    pub sync_mode: Option<String>,
    #[serde(default)]
    pub tier: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AntigravityBinaryInfo {
    pub name: String,
    pub path: String,
    pub kind: String, // "ide" | "app"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    #[serde(alias = "detectedBinary")]
    pub detected_binary: Option<String>,
    #[serde(alias = "profilesDir")]
    pub profiles_dir: String,
    #[serde(alias = "junctionSupport")]
    pub junction_support: bool,
    #[serde(alias = "totalStorageSavedMb")]
    pub total_storage_saved_mb: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ParentBinaries {
    #[serde(default)]
    pub app_path: Option<String>,
    #[serde(default)]
    pub ide_path: Option<String>,
    #[serde(default)]
    pub custom_configured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SolarSystemInfo {
    pub name: String,
    pub star_brain_path: String,
    pub is_shared: bool,
    pub total_conversations: usize,
    pub planets: Vec<Instance>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlackHoleInfo {
    pub name: String,
    pub app_path: Option<String>,
    pub ide_path: Option<String>,
    pub app_valid: bool,
    pub ide_valid: bool,
    #[serde(default)]
    pub app_running: bool,
    #[serde(default)]
    pub ide_running: bool,
    pub global_conversations_count: usize,
    pub global_brain_path: String,
    #[serde(default)]
    pub tethered_planets: Vec<Instance>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CosmicOverview {
    pub black_hole: BlackHoleInfo,
    pub solar_systems: Vec<SolarSystemInfo>,
    pub rogue_planets: Vec<Instance>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FleetState {
    pub accounts: Vec<Account>,
    pub instances: Vec<Instance>,
    #[serde(default, alias = "parentBinaries")]
    pub parent_binaries: Option<ParentBinaries>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInstanceInput {
    pub name: String,
    #[serde(default)]
    pub tag: Option<String>,
    #[serde(alias = "accountId")]
    pub account_id: Option<String>,
    pub mode: Option<String>,
    pub port: Option<u16>,
    #[serde(alias = "workspacePath")]
    pub workspace_path: Option<String>,
    #[serde(default, alias = "binaryPath")]
    pub binary_path: Option<String>,
    #[serde(default, alias = "customFlags")]
    pub custom_flags: Option<String>,
    #[serde(default, alias = "envVars")]
    pub env_vars: Option<std::collections::HashMap<String, String>>,
    #[serde(default, alias = "appType")]
    pub app_type: Option<String>,
    #[serde(default, alias = "createShortcut")]
    pub create_shortcut: Option<bool>,
    #[serde(default, alias = "blackholeSync")]
    pub blackhole_sync: Option<bool>,
    #[serde(default, alias = "syncMode")]
    pub sync_mode: Option<String>,
    #[serde(default)]
    pub tier: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AvailableGroup {
    pub name: String,
    pub instance_count: usize,
    pub instances: Vec<String>,
    pub has_shared_brain: bool,
}
