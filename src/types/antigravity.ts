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

export interface AntigravityInstance {
  id: string;
  name: string;
  description: string;
  tag: string;
  color: string;
  icon: string;
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
