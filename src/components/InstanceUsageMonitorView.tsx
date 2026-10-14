import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AntigravityInstance } from '../types/antigravity';
import { InstanceQuotaResult, QuotaBucket } from '../types/quota';
import { getAllAntigravityQuotas, getInstanceQuotaSummary, isTauri } from '../api';
import { EventHorizonIcon } from './EventHorizonIcon';
import { 
  RotateCw, 
  Clock, 
  ShieldAlert, 
  LogIn, 
  CheckCircle2, 
  HelpCircle,
  Play,
  Layers,
  Info
} from 'lucide-react';

interface InstanceUsageMonitorViewProps {
  instances: AntigravityInstance[];
  onSelectInstance?: (instanceId: string) => void;
  onLaunchInstance?: (instanceId: string) => void;
}

/**
 * Concentric Event Horizon Telemetry Gauge
 * Inspired by Option D:
 * - Outer smooth progress ring with remaining quota percentage
 * - Middle dashed photon sphere ring representing the reset orbit
 * - Central dark singularity void with luminous photon boundary
 */
function CircularUsageRing({ fraction, percentage }: { fraction: number; percentage: number }) {
  const size = 36;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, fraction)));

  // Color threshold matching the green circular rings in Antigravity
  let strokeColor = '#34d399'; // Emerald-400
  let photonColor = '#6ee7b7'; // Emerald-300
  if (percentage < 20) {
    strokeColor = '#f43f5e'; // Rose-500
    photonColor = '#fda4af'; // Rose-300
  } else if (percentage < 40) {
    strokeColor = '#f59e0b'; // Amber-500
    photonColor = '#fcd34d'; // Amber-300
  }

  const center = size / 2;
  const middleRadius = 11;
  const innerRadius = 6.2;

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Layer 1: Background outer track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#212328"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Layer 2: Middle Dashed Photon Orbit Ring (Option D inspiration) */}
        <circle
          cx={center}
          cy={center}
          r={middleRadius}
          stroke={photonColor}
          strokeWidth={1}
          strokeDasharray="2.5 2"
          fill="transparent"
          opacity={0.4}
        />

        {/* Layer 3: Central Singularity Core Void + Photon Rim */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="#0B0C0E"
          stroke={photonColor}
          strokeWidth={0.8}
          opacity={0.85}
        />

        {/* Micro Singularity Center Node */}
        <circle
          cx={center}
          cy={center}
          r={1.2}
          fill={strokeColor}
          opacity={0.9}
        />

        {/* Layer 4: Foreground animated progress ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
    </div>
  );
}

const STORAGE_QUOTAS_CACHE = 'orbitgravity_event_horizon_cache_v2';
const STORAGE_QUOTAS_FETCHED_AT = 'orbitgravity_event_horizon_fetched_at_v2';

const DEFAULT_PARENT_QUOTA: InstanceQuotaResult = {
  instanceId: 'black_hole_parent',
  instanceName: 'The Black Hole (Parent App)',
  appType: 'antigravity',
  profileDir: '',
  status: 'stopped',
  quotaStatus: 'no_token',
  accountEmail: undefined,
  accountName: undefined,
  errorMessage: 'No active Google session detected in parent installation. Log in via Antigravity to show live quota.',
  groups: [],
  description: 'Singularity Root Anchor',
  fetchedAt: new Date().toISOString(),
};

function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Not updated yet';
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 45) return 'Updated just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return 'Updated 1 minute ago';
  if (diffMin < 60) return `Updated ${diffMin} minutes ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return 'Updated 1 hour ago';
  if (diffHr < 24) return `Updated ${diffHr} hours ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Updated 1 day ago';
  return `Updated ${diffDays} days ago`;
}

export function InstanceUsageMonitorView({
  instances,
  onSelectInstance,
  onLaunchInstance,
}: InstanceUsageMonitorViewProps) {
  const [quotas, setQuotas] = useState<InstanceQuotaResult[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_QUOTAS_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.some((q) => q.instanceId === 'black_hole_parent' || q.instanceId === 'blackhole')) {
            return [DEFAULT_PARENT_QUOTA, ...parsed];
          }
          return parsed;
        }
      }
    } catch {}
    return [DEFAULT_PARENT_QUOTA];
  });
  const [loading, setLoading] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_QUOTAS_FETCHED_AT);
      if (saved) return new Date(saved);
    } catch {}
    return null;
  });

  // Launch genuine parent Antigravity executable via Tauri
  const handleLaunchParent = async () => {
    try {
      if (isTauri()) {
        await invoke('launch_parent_app', { variant: 'app' });
      }
    } catch (err) {
      console.error('Failed to launch parent app:', err);
    }
  };

  // Re-render time-ago badge every 30 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all quotas and guarantee Black Hole Parent card is preserved
  const fetchQuotas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllAntigravityQuotas();
      let merged = Array.isArray(data) ? [...data] : [];
      if (!merged.some((q) => q.instanceId === 'black_hole_parent' || q.instanceId === 'blackhole')) {
        try {
          const parentSingle = await getInstanceQuotaSummary('black_hole_parent');
          merged = [parentSingle, ...merged];
        } catch (pErr) {
          merged = [{
            ...DEFAULT_PARENT_QUOTA,
            quotaStatus: 'error',
            errorMessage: pErr instanceof Error ? pErr.message : String(pErr),
          }, ...merged];
        }
      }
      setQuotas(merged);
      const now = new Date();
      setLastFetchTime(now);
      try {
        localStorage.setItem(STORAGE_QUOTAS_CACHE, JSON.stringify(merged));
        localStorage.setItem(STORAGE_QUOTAS_FETCHED_AT, now.toISOString());
      } catch {}
    } catch (err) {
      console.error('Failed to load quota summaries:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setQuotas((prev) =>
        prev.map((q) => {
          if (q.instanceId === 'black_hole_parent' || q.instanceId === 'blackhole') {
            return {
              ...q,
              quotaStatus: 'error' as const,
              errorMessage: errMsg,
            };
          }
          return q;
        })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single quota on demand
  const handleRefreshSingle = async (instanceId: string) => {
    setRefreshingId(instanceId);
    try {
      const single = await getInstanceQuotaSummary(instanceId);
      setQuotas((prev) => {
        const next = prev.map((q) => (q.instanceId === instanceId ? single : q));
        try {
          localStorage.setItem(STORAGE_QUOTAS_CACHE, JSON.stringify(next));
        } catch {}
        return next;
      });
    } catch (err) {
      console.error(`Failed to refresh quota for instance ${instanceId}:`, err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setQuotas((prev) =>
        prev.map((q) => (q.instanceId === instanceId ? { ...q, quotaStatus: 'error' as const, errorMessage: errMsg } : q))
      );
    } finally {
      setRefreshingId(null);
    }
  };

  // Automatically refresh quotas on mount whenever entering Event Horizon
  useEffect(() => {
    fetchQuotas();
  }, [fetchQuotas]);

  // Guarantee The Black Hole Parent card is ALWAYS present as the very first card
  const parentCard: InstanceQuotaResult =
    quotas.find((q) => q.instanceId === 'black_hole_parent' || q.instanceId === 'blackhole') ||
    DEFAULT_PARENT_QUOTA;

  const satelliteCards = quotas
    .filter((q) => q.instanceId !== 'black_hole_parent' && q.instanceId !== 'blackhole')
    .sort((a, b) => a.instanceName.localeCompare(b.instanceName));

  const sortedQuotas = [parentCard, ...satelliteCards];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F1012] text-zinc-200">
      {/* Top Header */}
      <div className="p-6 border-b border-[#212328] bg-[#141518]/90 backdrop-blur shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-400">
              <EventHorizonIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2 flex-wrap">
                Event Horizon
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950/40 border border-orange-800/40 text-orange-300 font-medium">
                  {formatTimeAgo(lastFetchTime)}
                </span>
              </h1>
              <p className="text-xs text-[#808493] mt-0.5">
                Real-time Antigravity token limits, 5-hour quota recharge, and weekly resets across instances and Parent Singularity.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchQuotas}
            disabled={loading}
            className="px-3.5 py-1.5 bg-[#18191E] hover:bg-[#22242B] text-zinc-200 hover:text-white border border-[#2B2E3A] hover:border-orange-500/50 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-2xs hover:shadow-[0_0_12px_rgba(249,115,22,0.15)] disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 text-orange-400 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh All'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Instances Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {sortedQuotas.map((item) => {
              const isSingleRefreshing = refreshingId === item.instanceId;
              const isSuccess = item.quotaStatus === 'success';
              const isNoToken = item.quotaStatus === 'no_token';
              const isLicenseRequired = item.quotaStatus === 'license_required';
              const isRunning = item.status === 'running';
              const isBlackHole = item.instanceId === 'black_hole_parent' || item.instanceId === 'blackhole';

              return (
                <div
                  key={item.instanceId}
                  className={`${
                    isBlackHole
                      ? 'bg-gradient-to-b from-[#181326] to-[#12101B] border-purple-500/40 hover:border-purple-400/70 ring-1 ring-purple-500/20 shadow-purple-950/30'
                      : 'bg-[#141519] border-[#22242B] hover:border-[#2E313E]'
                  } border rounded-2xl p-5 flex flex-col justify-between transition shadow-lg w-full min-h-[380px] space-y-4`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#212328]">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className={`text-sm font-bold block ${isBlackHole ? 'text-purple-200' : 'text-zinc-100'}`}>
                          {isBlackHole ? 'The Black Hole (Parent App)' : item.instanceName}
                        </span>
                        {isBlackHole ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1.5 font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/60">
                            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-purple-400 animate-pulse' : 'bg-purple-600'}`} />
                            {isRunning ? 'PARENT ACTIVE' : 'PARENT STANDBY'}
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1.5 font-semibold ${
                              isRunning
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                : 'bg-[#18191E] text-zinc-400 border border-[#23252E]'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                            {isRunning ? 'RUNNING' : 'STOPPED'}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-[#7D818C] font-mono mt-1 flex items-center gap-2">
                        {isBlackHole ? (
                          item.accountEmail ? (
                            <span className="text-purple-300 font-medium font-sans">{item.accountEmail}</span>
                          ) : (
                            <span className="text-amber-400 font-medium font-sans flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                              Not Logged In
                            </span>
                          )
                        ) : (
                          item.accountEmail ? (
                            <span className="text-zinc-300 font-sans">{item.accountEmail}</span>
                          ) : (
                            <span>No account bound</span>
                          )
                        )}
                        <span>·</span>
                        <span className="uppercase text-[10px] text-zinc-500">
                          {isBlackHole ? 'Singularity Root' : item.appType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isBlackHole && onSelectInstance && (
                        <button
                          onClick={() => onSelectInstance(item.instanceId)}
                          className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#1E2028] rounded-lg transition cursor-pointer"
                          title="Open in Workspace"
                        >
                          Workspace
                        </button>
                      )}
                      <button
                        onClick={() => handleRefreshSingle(item.instanceId)}
                        disabled={isSingleRefreshing}
                        className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#1E2028] rounded-lg transition cursor-pointer disabled:opacity-50"
                        title={isBlackHole ? "Refresh parent app quota" : "Refresh this instance quota"}
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${isSingleRefreshing ? 'animate-spin text-purple-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Body Case 1: Quota Loaded Successfully */}
                  {isSuccess && (
                    <div className="flex-1 space-y-4">
                      {item.groups.map((group, gIdx) => (
                        <div key={gIdx} className={`space-y-1.5 ${gIdx > 0 ? 'pt-3.5 border-t border-[#212328]' : ''}`}>
                          <div className="flex items-center justify-between pb-1">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                              {group.displayName}
                            </h3>
                            {group.description && (
                              <span className="text-[10px] text-zinc-500 font-normal">
                                {group.description}
                              </span>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            {group.buckets.map((bucket: QuotaBucket, bIdx: number) => {
                              const isLow = bucket.remainingPercentage < 20;
                              const isMedium = bucket.remainingPercentage >= 20 && bucket.remainingPercentage < 40;
                              const percentColor = isLow ? 'text-rose-400' : isMedium ? 'text-amber-300' : 'text-zinc-100';

                              return (
                                <div
                                  key={bIdx}
                                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#18191E] transition group"
                                >
                                  <div className="space-y-0.5 min-w-0 pr-3">
                                    <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition block truncate">
                                      {bucket.displayName}
                                    </span>
                                    {bucket.resetInFormatted ? (
                                      <p className={`text-xs font-sans ${isLow ? 'text-rose-400/90' : isMedium ? 'text-amber-400/90' : 'text-zinc-400'}`}>
                                        {bucket.resetInFormatted}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-emerald-400/80 font-sans flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        100% Available
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className={`font-mono text-sm font-bold ${percentColor}`}>
                                      {bucket.remainingPercentage}%
                                    </span>
                                    <CircularUsageRing
                                      fraction={bucket.remainingFraction}
                                      percentage={bucket.remainingPercentage}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Body Case 1.5: Initial Detection in Progress */}
                  {loading && !lastFetchTime && !isSuccess && (
                    <div className="flex-1 flex flex-col justify-center my-auto py-8">
                      <div className="py-8 px-4 bg-[#0F1013] border border-[#23252E] rounded-xl flex flex-col items-center text-center space-y-3">
                        <div className="w-10 h-10 rounded-full bg-purple-950/60 text-purple-400 border border-purple-800/40 flex items-center justify-center animate-spin">
                          <RotateCw className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 max-w-xs">
                          <h4 className="text-xs font-semibold text-zinc-200">
                            Connecting to Antigravity Singularity...
                          </h4>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            Detecting Google credentials and querying Code Assist quota telemetry...
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Body Case 2: Not Authenticated / No Token */}
                  {isNoToken && (!loading || lastFetchTime) && (
                    <div className="flex-1 flex flex-col justify-center my-auto py-4">
                      <div className="py-8 px-4 bg-[#0F1013] border border-dashed border-[#23252E] rounded-xl flex flex-col items-center text-center space-y-3">
                        <div className={`w-10 h-10 rounded-full ${isBlackHole ? 'bg-purple-950/60 text-purple-400 border border-purple-800/40' : 'bg-zinc-800/80 text-zinc-400'} flex items-center justify-center`}>
                          <LogIn className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 max-w-xs">
                          <h4 className="text-xs font-semibold text-zinc-200">
                            {isBlackHole
                              ? (item.accountEmail ? 'Parent Session Unsynchronized' : 'Parent Antigravity Credentials Required')
                              : 'Login to the instance to show data'}
                          </h4>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            {isBlackHole
                              ? (item.accountEmail
                                  ? `Account ${item.accountEmail} detected in Antigravity storage. Launch Antigravity to refresh live quota telemetry.`
                                  : 'No stored Google credentials found in the parent Antigravity profile. Launch Antigravity and sign in to view live quota telemetry.')
                              : 'No stored OAuth token found in this profile. Launch the instance and log in with Google to view live telemetry.'}
                          </p>
                        </div>
                        {isBlackHole ? (
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={handleLaunchParent}
                              className="px-3.5 py-1.5 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/50 text-purple-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Play className="w-3 h-3 text-purple-400 fill-purple-400" />
                              Launch Parent App
                            </button>
                            <button
                              onClick={() => handleRefreshSingle(item.instanceId)}
                              disabled={isSingleRefreshing}
                              className="px-3 py-1.5 bg-[#18191E] hover:bg-[#22242B] border border-[#2B2E3A] text-zinc-300 hover:text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <RotateCw className={`w-3 h-3 ${isSingleRefreshing ? 'animate-spin text-purple-400' : ''}`} />
                              Check Again
                            </button>
                          </div>
                        ) : (
                          onLaunchInstance && (
                            <button
                              onClick={() => onLaunchInstance(item.instanceId)}
                              className="px-3.5 py-1.5 bg-[#18191E] hover:bg-[#22242B] border border-[#2B2E3A] text-zinc-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer mt-1"
                            >
                              <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                              Launch Instance
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Body Case 3: License Required */}
                  {isLicenseRequired && (!loading || lastFetchTime) && (
                    <div className="flex-1 flex flex-col justify-center my-auto py-4">
                      <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl flex items-start gap-3.5">
                        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-amber-300">
                            Subscription Required
                          </h4>
                          <p className="text-[11px] text-amber-200/70 leading-relaxed">
                            {item.accountEmail ? `Account ${item.accountEmail} does not have an active Gemini Code Assist license.` : 'This Google account does not have an active Gemini Code Assist license.'} Connect a licensed account to view live quotas.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Body Case 4: Other Error */}
                  {item.quotaStatus === 'error' && (!loading || lastFetchTime) && (
                    <div className="flex-1 flex flex-col justify-center my-auto py-4">
                      <div className="p-4 bg-rose-950/20 border border-rose-800/40 rounded-xl flex items-start gap-3.5">
                        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-rose-300">
                            Telemetry Session Error
                          </h4>
                          <p className="text-[11px] text-rose-200/80 leading-relaxed break-words">
                            {item.errorMessage || 'Unknown error occurred while contacting Google service.'}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            {isBlackHole && (
                              <button
                                onClick={handleLaunchParent}
                                className="px-3 py-1 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/50 text-purple-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <Play className="w-3 h-3 text-purple-400 fill-purple-400" />
                                Launch Parent App
                              </button>
                            )}
                            <button
                              onClick={() => handleRefreshSingle(item.instanceId)}
                              disabled={isSingleRefreshing}
                              className="px-3 py-1 bg-[#18191E] hover:bg-[#22242B] border border-[#2B2E3A] text-zinc-300 hover:text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <RotateCw className={`w-3 h-3 ${isSingleRefreshing ? 'animate-spin text-purple-400' : ''}`} />
                              Retry Quota Sync
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card Footer */}
                  <div className="mt-auto pt-3 border-t border-[#1E2028] flex items-center justify-between text-[10.5px] font-mono text-zinc-500">
                    <span>Checked: {new Date(item.fetchedAt).toLocaleTimeString()}</span>
                    <span className="text-zinc-500">
                      {isRunning ? 'Active Live Session' : 'Stored Snapshot'}
                    </span>
                  </div>
                </div>
              );
            })}
            {satelliteCards.length === 0 && (
              <div className="p-5 rounded-2xl border border-dashed border-[#212328] bg-[#101114]/60 flex flex-col items-center justify-center text-center space-y-2.5 min-h-[380px]">
                <Layers className="w-8 h-8 text-zinc-700" />
                <h4 className="text-xs font-semibold text-zinc-300">No Satellite Instances</h4>
                <p className="text-[11px] text-zinc-500 max-w-xs leading-relaxed">
                  The Black Hole anchor monitors your main Google Antigravity install. Create profile instances in Workspace to track additional accounts and quotas here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
