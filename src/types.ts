export type AccountStatus = 'active' | 'warning' | 'throttled' | 'exhausted';

export interface AccountProfile {
  id: string;
  name: string;
  email: string;
  tier: string;
  status: AccountStatus;
  apiKey: string;
  tokensUsed: number;
  tokensMax: number;
  tokensUnit: string;
  resetsIn: string;
  rpmCurrent: number;
  rpmMax: number;
  dailySpend: number;
  dailyCap: number;
  activeIdes: number;
  maxIdes: number;
  instancesLinked: number;
}

export type InstanceStatus = 'running' | 'stopped';

export interface InstanceItem {
  id: string;
  name: string;
  accountName: string;
  accountId: string;
  port: string;
  tokensStr: string;
  status: InstanceStatus;
  tagColor?: string;
  dotColor?: string;
  iconType?: 'code' | 'window' | 'table' | 'sparkle' | 'brackets' | 'terminal';
  iconBg?: string;
  workspacePath?: string;
  profileMode?: 'auth-only' | 'full';
  shortcutKey?: string;
  breadcrumbPath?: string;
  model?: string;
  duration?: string;
}

export interface EngineHealth {
  detectedBinary: string;
  profilesDirectory: string;
  mechanism: string;
  storageSaved: string;
  statusText: string;
}

export interface CreateInstanceInput {
  name: string;
  accountId: string;
  mode: 'auth-only' | 'full';
  workspacePath?: string;
  model?: string;
}

export interface CreateAccountInput {
  name: string;
  email: string;
  tier: string;
  tokensMax: number;
  rpmMax: number;
  dailyCap: number;
  maxIdes: number;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export type NavTab = 'shortcuts' | 'quotas' | 'workspace';
