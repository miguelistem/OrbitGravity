import { invoke } from '@tauri-apps/api/core';
import type {
  AccountProfile,
  InstanceItem,
  EngineHealth,
  CreateInstanceInput,
  CreateAccountInput,
} from './types';

// Check if running inside native Tauri runtime
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

const DEFAULT_ACCOUNTS: AccountProfile[] = [
  {
    id: 'acc_1',
    name: 'Google Cloud Enterprise - Co...',
    email: 'uncle123elmo@gmail.com',
    tier: 'Enterprise Ultra',
    status: 'active',
    apiKey: 'ag_live_9f83********42a1',
    tokensUsed: 68.5,
    tokensMax: 100.0,
    tokensUnit: 'M',
    resetsIn: '4d 23h left',
    rpmCurrent: 112,
    rpmMax: 300,
    dailySpend: 84.2,
    dailyCap: 250.0,
    activeIdes: 2,
    maxIdes: 12,
    instancesLinked: 2,
  },
  {
    id: 'acc_2',
    name: 'Personal Pro - Dev & Research',
    email: 'dev-personal@antigravity.ai',
    tier: 'Pro',
    status: 'warning',
    apiKey: 'ag_live_3c18********89d2',
    tokensUsed: 17.2,
    tokensMax: 20.0,
    tokensUnit: 'M',
    resetsIn: '1d 4h left',
    rpmCurrent: 52,
    rpmMax: 60,
    dailySpend: 42.15,
    dailyCap: 50.0,
    activeIdes: 0,
    maxIdes: 4,
    instancesLinked: 2,
  },
  {
    id: 'acc_3',
    name: 'Graviton Quantum AI Lab - TI...',
    email: 'lab-cluster@antigravity.internal',
    tier: 'Team Unlimited',
    status: 'active',
    apiKey: 'ag_live_7e44********11ff',
    tokensUsed: 34.9,
    tokensMax: 250.0,
    tokensUnit: 'M',
    resetsIn: '13d 23h left',
    rpmCurrent: 34,
    rpmMax: 600,
    dailySpend: 98.4,
    dailyCap: 500.0,
    activeIdes: 0,
    maxIdes: 20,
    instancesLinked: 1,
  },
];

const DEFAULT_INSTANCES: InstanceItem[] = [
  {
    id: 'inst_1',
    name: 'Portfolio Project Ideas For Attention',
    accountName: 'google cloud enterpr...',
    accountId: 'acc_1',
    port: '3000',
    tokensStr: '1.9Mt',
    status: 'running',
    dotColor: 'bg-emerald-400',
    iconType: 'brackets',
    iconBg: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
    workspacePath: 'e:\\Projects\\Portfolio-Ideas',
    profileMode: 'auth-only',
  },
  {
    id: 'inst_2',
    name: 'Rust Core Microservices',
    accountName: 'google cloud enterpr...',
    accountId: 'acc_1',
    port: '3042',
    tokensStr: '3.4Mt',
    status: 'running',
    dotColor: 'bg-emerald-400',
    iconType: 'window',
    iconBg: 'bg-blue-600/25 text-blue-400 border-blue-500/40',
    workspacePath: 'e:\\Projects\\Rust-Microservices',
    profileMode: 'auth-only',
  },
  {
    id: 'inst_3',
    name: 'Resume and Project Updates',
    accountName: 'Personal Pro',
    accountId: 'acc_2',
    port: '3001',
    tokensStr: '600.4kt',
    status: 'stopped',
    dotColor: 'bg-emerald-500/40',
    iconType: 'table',
    iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    workspacePath: 'e:\\Projects\\Resume-Updates',
    profileMode: 'auth-only',
  },
  {
    id: 'inst_4',
    name: 'Combining PLC And AI Exploration',
    accountName: 'Graviton Quantum AI ...',
    accountId: 'acc_3',
    port: '5000',
    tokensStr: '4.1Mt',
    status: 'stopped',
    dotColor: 'bg-amber-400',
    iconType: 'sparkle',
    iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    workspacePath: 'e:\\Projects\\PLC-AI-Exploration',
    profileMode: 'full',
  },
  {
    id: 'inst_5',
    name: 'Redesign my projects.html',
    accountName: 'Personal Pro',
    accountId: 'acc_2',
    port: '4200',
    tokensStr: '240.6kt',
    status: 'stopped',
    dotColor: 'bg-purple-400',
    iconType: 'code',
    iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    workspacePath: 'e:\\Projects\\Redesign-Web',
    profileMode: 'auth-only',
  },
];

const DEFAULT_HEALTH: EngineHealth = {
  detectedBinary: 'Antigravity.exe & IDE.exe',
  profilesDirectory: 'C:\\Users\\Miguel\\AntigravityProfiles',
  mechanism: 'NTFS Directory Junctions',
  storageSaved: '~1.98 GB (Shared Exts)',
  statusText: 'Junctions: Active • Antigravity 2.0.1 Ready',
};

// Local storage helpers for mock mode persistence
const STORAGE_ACCOUNTS_KEY = 'fleethub_accounts_data';
const STORAGE_INSTANCES_KEY = 'fleethub_instances_data';

export const loadMockAccounts = (): AccountProfile[] => {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_ACCOUNTS;
};

const saveMockAccounts = (accounts: AccountProfile[]) => {
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
};

export const loadMockInstances = (): InstanceItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_INSTANCES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_INSTANCES;
};

const saveMockInstances = (instances: InstanceItem[]) => {
  try {
    localStorage.setItem(STORAGE_INSTANCES_KEY, JSON.stringify(instances));
  } catch {
    // ignore
  }
};

export const api = {
  async getAccounts(): Promise<AccountProfile[]> {
    if (isTauri()) {
      try {
        return await invoke<AccountProfile[]>('get_accounts');
      } catch (err) {
        console.warn('Tauri invoke get_accounts fallback:', err);
      }
    }
    return loadMockAccounts();
  },

  async getInstances(): Promise<InstanceItem[]> {
    if (isTauri()) {
      try {
        return await invoke<InstanceItem[]>('get_instances');
      } catch (err) {
        console.warn('Tauri invoke get_instances fallback:', err);
      }
    }
    return loadMockInstances();
  },

  async getEngineHealth(): Promise<EngineHealth> {
    if (isTauri()) {
      try {
        return await invoke<EngineHealth>('get_engine_health');
      } catch (err) {
        console.warn('Tauri invoke get_engine_health fallback:', err);
      }
    }
    return DEFAULT_HEALTH;
  },

  async toggleInstance(id: string): Promise<{ instance: InstanceItem; isRunning: boolean }> {
    if (isTauri()) {
      try {
        const res = await invoke<{ instance: InstanceItem; isRunning: boolean }>('toggle_instance', { id });
        return res;
      } catch (err) {
        console.warn('Tauri invoke toggle_instance fallback:', err);
      }
    }

    const instances = loadMockInstances();
    const accounts = loadMockAccounts();
    const inst = instances.find((i) => i.id === id);
    if (!inst) throw new Error(`Instance not found: ${id}`);

    const willRun = inst.status !== 'running';
    inst.status = willRun ? 'running' : 'stopped';
    inst.dotColor = willRun ? 'bg-emerald-400' : 'bg-slate-500';

    // Update account IDE count
    const acc = accounts.find((a) => a.id === inst.accountId);
    if (acc) {
      if (willRun) {
        acc.activeIdes = Math.min(acc.activeIdes + 1, acc.maxIdes);
      } else {
        acc.activeIdes = Math.max(acc.activeIdes - 1, 0);
      }
      saveMockAccounts(accounts);
    }

    saveMockInstances(instances);
    return { instance: inst, isRunning: willRun };
  },

  async createInstance(input: CreateInstanceInput): Promise<InstanceItem> {
    if (isTauri()) {
      try {
        return await invoke<InstanceItem>('create_instance', { input });
      } catch (err) {
        console.warn('Tauri invoke create_instance fallback:', err);
      }
    }

    const instances = loadMockInstances();
    const accounts = loadMockAccounts();
    const acc = accounts.find((a) => a.id === input.accountId);

    const portNum = 3000 + (instances.length + 1) * 7;
    const icons: Array<'code' | 'window' | 'table' | 'sparkle' | 'brackets'> = [
      'brackets',
      'window',
      'table',
      'sparkle',
      'code',
    ];
    const iconType = icons[instances.length % icons.length];
    const bgs = [
      'bg-sky-500/20 text-sky-400 border-sky-500/40',
      'bg-blue-600/25 text-blue-400 border-blue-500/40',
      'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      'bg-amber-500/20 text-amber-400 border-amber-500/40',
      'bg-purple-500/20 text-purple-400 border-purple-500/40',
    ];

    const newInst: InstanceItem = {
      id: `inst_${Date.now()}`,
      name: input.name,
      accountId: input.accountId,
      accountName: acc ? acc.name.slice(0, 18) + '...' : 'Custom Account',
      port: portNum.toString(),
      tokensStr: '0kt',
      status: 'stopped',
      dotColor: 'bg-slate-500',
      iconType,
      iconBg: bgs[instances.length % bgs.length],
      workspacePath: input.workspacePath || `e:\\Projects\\${input.name.toLowerCase().replace(/\s+/g, '-')}`,
      profileMode: input.mode,
    };

    instances.push(newInst);
    saveMockInstances(instances);

    if (acc) {
      acc.instancesLinked += 1;
      saveMockAccounts(accounts);
    }

    return newInst;
  },

  async createAccount(input: CreateAccountInput): Promise<AccountProfile> {
    if (isTauri()) {
      try {
        return await invoke<AccountProfile>('create_account', { input });
      } catch (err) {
        console.warn('Tauri invoke create_account fallback:', err);
      }
    }

    const accounts = loadMockAccounts();
    const randomHex = Math.random().toString(16).substring(2, 6);
    const newAcc: AccountProfile = {
      id: `acc_${Date.now()}`,
      name: input.name,
      email: input.email,
      tier: input.tier,
      status: 'active',
      apiKey: `ag_live_${randomHex}********${Date.now().toString().slice(-4)}`,
      tokensUsed: 0.1,
      tokensMax: input.tokensMax || 50,
      tokensUnit: 'M',
      resetsIn: '29d 23h left',
      rpmCurrent: 1,
      rpmMax: input.rpmMax || 120,
      dailySpend: 0.0,
      dailyCap: input.dailyCap || 100,
      activeIdes: 0,
      maxIdes: input.maxIdes || 6,
      instancesLinked: 0,
    };

    accounts.push(newAcc);
    saveMockAccounts(accounts);
    return newAcc;
  },

  async resetCycle(accountId: string): Promise<boolean> {
    if (isTauri()) {
      try {
        return await invoke<boolean>('reset_account_cycle', { accountId });
      } catch (err) {
        console.warn('Tauri invoke reset_account_cycle fallback:', err);
      }
    }

    const accounts = loadMockAccounts();
    const acc = accounts.find((a) => a.id === accountId);
    if (acc) {
      acc.tokensUsed = 0.2;
      acc.dailySpend = 0.5;
      acc.status = 'active';
      saveMockAccounts(accounts);
      return true;
    }
    return false;
  },
};
