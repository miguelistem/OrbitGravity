export type InstanceStatus = 'running' | 'idle' | 'paused' | 'stopped' | 'crashed';

export type AgentAutonomy = 'supervised' | 'semi-autonomous' | 'full-autopilot';

export type DisplayMode = 'desktop-gui' | 'headless-worker' | 'tui-terminal' | 'web-canvas';

export type LogLevel = 'info' | 'agent' | 'exec' | 'warn' | 'error' | 'token';

export interface AntigravityAccount {
  id: string;
  name: string;
  email: string;
  tier: 'Starter' | 'Pro' | 'Enterprise Ultra' | 'Team Unlimited';
  monthlyTokenAllowance: number;
  tokensUsed: number;
  rpmLimit: number;
  currentRpm: number;
  maxConcurrentSessions: number;
  dailyBudgetUsd: number;
  spentTodayUsd: number;
  quotaResetDate: string; // ISO string
  status: 'active' | 'warning' | 'throttled' | 'exhausted';
  apiKeyMasked: string;
}

export type AntigravityAppType = 'antigravity_ide' | 'antigravity';

export type InstanceTier = 'Free' | 'Plus' | 'Pro';

export type GravitationalSyncMode = 'solo' | 'solar_system' | 'black_hole';

export interface AntigravityInstance {
  id: string;
  name: string;
  description: string;
  tag: string;
  color: string;
  icon: string;
  tier?: InstanceTier;
  status: InstanceStatus;
  accountId: string;
  appType?: AntigravityAppType;
  createShortcut?: boolean;
  pid?: number;
  port?: number;
  
  // Workspace & Environment Settings
  workspacePath: string;
  profileDir?: string;
  binaryPath?: string;
  displayMode?: DisplayMode;
  envVars: Record<string, string>;
  customFlags: string;
  
  // Real Timers & Activity
  startedAt: number | null;
  totalElapsedSeconds: number; // Real session duration in seconds
  lastActivityAt: number;
  createdAt: string;
  blackholeSync?: boolean;
  syncMode?: GravitationalSyncMode;
}

export interface LogEntry {
  id: string;
  instanceId: string;
  timestamp: string; // HH:mm:ss.SSS
  level: LogLevel;
  source: string;
  message: string;
  details?: string;
}

export interface DesktopShortcutConfig {
  instance: AntigravityInstance;
  account?: AntigravityAccount;
  platform: 'windows' | 'mac' | 'linux' | 'uri';
}

export interface ConversationInfo {
  id: string;
  title: string;
  preview: string;
  step_count: number;
  last_modified: string;
  source_name: string;
}

export interface SharedBrainStatus {
  group_name: string;
  is_shared: boolean;
  member_count: number;
  shared_path?: string;
  members: string[];
}

export interface ParentBinaries {
  appPath?: string;
  idePath?: string;
  customConfigured?: boolean;
}

export interface SolarSystemInfo {
  name: string;
  starBrainPath: string;
  isShared: boolean;
  totalConversations: number;
  planets: AntigravityInstance[];
}

export interface BlackHoleInfo {
  name: string;
  appPath?: string;
  idePath?: string;
  appValid: boolean;
  ideValid: boolean;
  appRunning?: boolean;
  ideRunning?: boolean;
  globalConversationsCount: number;
  globalBrainPath: string;
}

export interface CosmicOverview {
  blackHole: BlackHoleInfo;
  solarSystems: SolarSystemInfo[];
  roguePlanets: AntigravityInstance[];
}

