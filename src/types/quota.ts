export interface QuotaBucket {
  bucketId: string;
  displayName: string;
  window: string;
  remainingFraction: number;
  remainingPercentage: number;
  resetTime?: string;
  resetInFormatted?: string;
  description?: string;
}

export interface QuotaGroup {
  displayName: string;
  description?: string;
  buckets: QuotaBucket[];
}

export interface InstanceQuotaResult {
  instanceId: string;
  instanceName: string;
  appType: string;
  profileDir: string;
  status: string; // "running" | "stopped"
  quotaStatus: 'success' | 'no_token' | 'license_required' | 'error';
  accountEmail?: string;
  accountName?: string;
  errorMessage?: string;
  groups: QuotaGroup[];
  description?: string;
  fetchedAt: string;
}
