import { AntigravityAccount, AntigravityInstance, LogEntry } from '../types/antigravity';

export const INITIAL_ACCOUNTS: AntigravityAccount[] = [
  {
    id: 'acc-enterprise',
    name: 'Google Cloud Platform - Production (us-east1)',
    email: 'dev.pilot@antigravity.internal',
    tier: 'Enterprise Ultra',
    monthlyTokenAllowance: 100_000_000,
    tokensUsed: 68_450_200,
    rpmLimit: 300,
    currentRpm: 112,
    maxConcurrentSessions: 12,
    dailyBudgetUsd: 250.00,
    spentTodayUsd: 84.20,
    quotaResetDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    status: 'active',
    apiKeyMasked: 'ag_live_9f83••••••••42a1',
  },
  {
    id: 'acc-pro',
    name: 'Developer Fleet - Primary Workspace',
    email: 'dev-workspace@antigravity.ai',
    tier: 'Pro',
    monthlyTokenAllowance: 20_000_000,
    tokensUsed: 17_210_000,
    rpmLimit: 60,
    currentRpm: 52,
    maxConcurrentSessions: 4,
    dailyBudgetUsd: 50.00,
    spentTodayUsd: 42.15,
    quotaResetDate: new Date(Date.now() + 1.2 * 86400000).toISOString(),
    status: 'warning',
    apiKeyMasked: 'ag_live_3c18••••••••89d2',
  },
  {
    id: 'acc-lab',
    name: 'Systems Lab - High Throughput Tier',
    email: 'systems-lab@antigravity.internal',
    tier: 'Team Unlimited',
    monthlyTokenAllowance: 250_000_000,
    tokensUsed: 34_900_000,
    rpmLimit: 600,
    currentRpm: 34,
    maxConcurrentSessions: 20,
    dailyBudgetUsd: 500.00,
    spentTodayUsd: 98.40,
    quotaResetDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    status: 'active',
    apiKeyMasked: 'ag_live_7e44••••••••11ff',
  },
];

export const INITIAL_INSTANCES: AntigravityInstance[] = [];

export const INITIAL_LOGS: Record<string, LogEntry[]> = {};
