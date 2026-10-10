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

export interface AntigravityInstance {
  id: string;
  name: string;
  description: string;
  tag: string;
  color: string; // e.g. 'cyan', 'emerald', 'violet', 'amber', 'rose', 'blue'
  icon: string; // 'terminal' | 'cpu' | 'code' | 'layers' | 'zap' | 'bot' | 'database' | 'server'
  status: InstanceStatus;
  accountId: string;
  
  // Workspace & Environment Settings
  workspacePath: string;
  gitBranch: string;
  workingDirectory: string;
  model: string;
  port: number;
  debugPort: number;
  displayMode: DisplayMode;
  agentAutonomy: AgentAutonomy;
  ramAllocationMb: number;
  cpuCores: number;
  envVars: Record<string, string>;
  customFlags: string;
  
  // Timers & Limiting Settings
  ttlMinutes: number; // Max session duration before auto-shutdown (0 = infinite)
  autoSleepIdleMinutes: number; // Idle minutes before auto-pausing (0 = disabled)
  
  // Dynamic State & Telemetry
  startedAt: number | null; // epoch ms
  totalElapsedSeconds: number; // cumulative running seconds
  lastActivityAt: number; // epoch ms
  billableSeconds: number;
  tokensConsumedSession: number;
  requestsMadeSession: number;
  cpuUsagePercent: number;
  ramUsageMb: number;
  
  // Desktop Shortcut Metadata
  shortcutHotkey?: string;
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
