import React, { useId } from 'react';

export interface EventHorizonIconProps {
  className?: string;
  size?: number | string;
  variant?: 'fiery' | 'emerald' | 'monochrome';
}

/**
 * EventHorizonIcon (Option D: Concentric Photon Horizon)
 * 
 * Clean, perfectly balanced 1:1 circular icon inspired by the black hole accretion disk:
 * - Outer circular accretion boundary
 * - Middle orbital photon sphere with relativistic dash rhythm
 * - Deep pitch-black central singularity void with luminous photon rim
 */
export function EventHorizonIcon({
  className = 'w-5 h-5',
  size,
  variant = 'fiery',
}: EventHorizonIconProps) {
  const rawId = useId();
  const id = rawId.replace(/:/g, '');
  const gradId = `eh-d-grad-${id}`;
  const coreGradId = `eh-d-core-${id}`;

  const styleProps: React.CSSProperties = {};
  if (size) {
    styleProps.width = typeof size === 'number' ? `${size}px` : size;
    styleProps.height = typeof size === 'number' ? `${size}px` : size;
  }

  if (variant === 'monochrome') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={styleProps}
      >
        {/* Outer Circular Accretion Ring */}
        <circle cx="12" cy="12" r="9.5" strokeWidth="1.8" />
        {/* Middle Dashed Photon Ring */}
        <circle
          cx="12"
          cy="12"
          r="6.2"
          strokeWidth="1.2"
          strokeDasharray="6 2.5"
          opacity="0.75"
        />
        {/* Central Singularity Void */}
        <circle
          cx="12"
          cy="12"
          r="3.6"
          fill="#0B0C10"
          stroke="currentColor"
          strokeWidth="1.1"
        />
      </svg>
    );
  }

  const isEmerald = variant === 'emerald';

  const stops = isEmerald ? (
    <>
      <stop offset="0%" stopColor="#059669" />
      <stop offset="50%" stopColor="#34D399" />
      <stop offset="100%" stopColor="#10B981" />
    </>
  ) : (
    <>
      <stop offset="0%" stopColor="#EA580C" />
      <stop offset="50%" stopColor="#FBBF24" />
      <stop offset="100%" stopColor="#F97316" />
    </>
  );

  const photonColor = isEmerald ? '#A7F3D0' : '#FEF08A';
  const middleStroke = isEmerald ? '#34D399' : '#FBBF24';
  const rimGlow = isEmerald ? '#10B981' : '#F97316';

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={styleProps}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          {stops}
        </linearGradient>

        <radialGradient id={coreGradId} cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#06070A" />
          <stop offset="100%" stopColor={rimGlow} stopOpacity="0.6" />
        </radialGradient>
      </defs>

      {/* 1. Outer Circular Accretion Ring */}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke={`url(#${gradId})`}
        strokeWidth="1.8"
      />

      {/* 2. Middle Orbital Photon Sphere (Dashed) */}
      <circle
        cx="12"
        cy="12"
        r="6.2"
        stroke={middleStroke}
        strokeWidth="1.2"
        strokeDasharray="6 2.5"
        opacity="0.9"
      />

      {/* 3. Central Event Horizon Singularity Void + Bright Photon Edge */}
      <circle
        cx="12"
        cy="12"
        r="3.6"
        fill={`url(#${coreGradId})`}
        stroke={photonColor}
        strokeWidth="0.85"
      />
    </svg>
  );
}
