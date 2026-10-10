import React, { useState, useEffect } from 'react';
import type {
  AccountProfile,
  InstanceItem,
  EngineHealth,
  CreateInstanceInput,
  CreateAccountInput,
  ToastNotification,
} from './types';
import { api, loadMockAccounts, loadMockInstances, isTauri } from './api';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { MainDashboard } from './components/MainDashboard';
import { NewInstanceModal } from './components/NewInstanceModal';
import { NewAccountModal } from './components/NewAccountModal';
import { ToastContainer } from './components/ToastContainer';

export function App() {
  const [accounts, setAccounts] = useState<AccountProfile[]>(() => loadMockAccounts());
  const [instances, setInstances] = useState<InstanceItem[]>(() => loadMockInstances());
  const [health, setHealth] = useState<EngineHealth>({
    detectedBinary: 'Antigravity.exe & IDE.exe',
    profilesDirectory: 'C:\\Users\\Miguel\\AntigravityProfiles',
    mechanism: 'NTFS Directory Junctions',
    storageSaved: '~1.98 GB (Shared Exts)',
    statusText: 'Junctions: Active • Antigravity 2.0.1 Ready',
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isNewInstanceModalOpen, setIsNewInstanceModalOpen] = useState(false);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [activeProjectTitle, setActiveProjectTitle] = useState('Redesign my projects.html');

  // Synchronize with native Tauri backend on mount if running under Tauri
  useEffect(() => {
    if (!isTauri()) return;
    let isMounted = true;

    const syncWithBackend = async () => {
      try {
        const [accs, insts, hlth] = await Promise.all([
          api.getAccounts(),
          api.getInstances(),
          api.getEngineHealth(),
        ]);
        if (isMounted) {
          setAccounts(accs);
          setInstances(insts);
          setHealth(hlth);
        }
      } catch (err) {
        console.error('Failed to sync with Tauri backend:', err);
      }
    };

    void syncWithBackend();

    return () => {
      isMounted = false;
    };
  }, []);

  const addToast = (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Toggle instance launch / stop
  const handleToggleInstance = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { instance, isRunning } = await api.toggleInstance(id);

      // Refresh instances and accounts state
      setInstances((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...instance } : i))
      );
      const updatedAccounts = await api.getAccounts();
      setAccounts(updatedAccounts);

      if (isRunning) {
        setActiveProjectTitle(instance.name);
        addToast(
          'success',
          'Instance Launched',
          `"${instance.name}" is now running on port :${instance.port}`
        );
      } else {
        addToast(
          'info',
          'Instance Stopped',
          `"${instance.name}" has been stopped safely.`
        );
      }
    } catch (err) {
      console.error(err);
      addToast(
        'error',
        'Action Failed',
        'Could not update instance execution state.'
      );
    }
  };

  // Create new instance
  const handleCreateInstance = async (input: CreateInstanceInput) => {
    const newInst = await api.createInstance(input);
    setInstances((prev) => [...prev, newInst]);
    const updatedAccounts = await api.getAccounts();
    setAccounts(updatedAccounts);
    addToast(
      'success',
      'Instance Shortcut Created',
      `"${newInst.name}" was bound to ${newInst.accountName} (mode: ${newInst.profileMode || 'auth-only'})`
    );
  };

  // Create new account profile
  const handleCreateAccount = async (input: CreateAccountInput) => {
    const newAcc = await api.createAccount(input);
    setAccounts((prev) => [...prev, newAcc]);
    addToast(
      'success',
      'Account Profile Added',
      `"${newAcc.name}" (${newAcc.tier}) registered with quota telemetry.`
    );
  };

  // Reset cycle
  const handleResetCycle = async (accountId: string) => {
    await api.resetCycle(accountId);
    const updatedAccounts = await api.getAccounts();
    setAccounts(updatedAccounts);
    const acc = updatedAccounts.find((a) => a.id === accountId);
    addToast(
      'info',
      'Cycle Quota Reset',
      `Monthly tokens and daily spend reset for ${acc?.name || 'account profile'}.`
    );
  };

  // Copy API Key
  const handleCopyKey = (key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(key);
      addToast('info', 'API Key Copied', 'Copied token identifier to clipboard.');
    }
  };

  // Count active sessions
  const activeSessionsCount = instances.filter((i) => i.status === 'running').length;
  const maxSessionsCount = 4; // Matches screenshot: 2 / 4 active

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b0f17] text-[#cbd5e1] overflow-hidden select-none font-sans antialiased">
      {/* 1. Header Bar: Simulated Windows window header */}
      <TitleBar activeTitle={activeProjectTitle} />

      {/* 2. Main App Layout: Sidebar + Canvas */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          instances={instances}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenNewInstance={() => setIsNewInstanceModalOpen(true)}
          onToggleInstance={handleToggleInstance}
          activeSessionsCount={activeSessionsCount}
          maxSessionsCount={maxSessionsCount}
        />

        <MainDashboard
          accounts={accounts}
          health={health}
          onOpenNewAccount={() => setIsNewAccountModalOpen(true)}
          onResetCycle={handleResetCycle}
          onCopyKey={handleCopyKey}
        />
      </div>

      {/* 3. Modals */}
      <NewInstanceModal
        isOpen={isNewInstanceModalOpen}
        onClose={() => setIsNewInstanceModalOpen(false)}
        accounts={accounts}
        onSubmit={handleCreateInstance}
      />

      <NewAccountModal
        isOpen={isNewAccountModalOpen}
        onClose={() => setIsNewAccountModalOpen(false)}
        onSubmit={handleCreateAccount}
      />

      {/* 4. Feedback Toasts */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}

export default App;
