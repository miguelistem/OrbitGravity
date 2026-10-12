import { invoke } from '@tauri-apps/api/core';
import type { InstanceQuotaResult } from './types/quota';

/**
 * Check if running inside native Tauri runtime
 */
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

/**
 * Fetch real-time quota telemetry for all Antigravity instances.
 */
export async function getAllAntigravityQuotas(): Promise<InstanceQuotaResult[]> {
  if (isTauri()) {
    try {
      return await invoke<InstanceQuotaResult[]>('get_all_antigravity_quotas');
    } catch (err) {
      console.error('Failed to get all Antigravity quotas:', err);
      throw err;
    }
  }
  return [];
}

/**
 * Fetch real-time quota telemetry for a specific instance by ID.
 */
export async function getInstanceQuotaSummary(id: string): Promise<InstanceQuotaResult> {
  if (isTauri()) {
    return await invoke<InstanceQuotaResult>('get_instance_quota_summary', { id });
  }
  throw new Error('Native runtime required');
}
