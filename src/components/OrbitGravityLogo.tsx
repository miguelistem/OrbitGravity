import React from 'react';

interface OrbitGravityLogoProps {
  size?: number;
  showSquircle?: boolean;
  className?: string;
}

export function OrbitGravityLogo({
  size = 24,
  showSquircle = true,
  className = '',
}: OrbitGravityLogoProps) {
  const chromeGradId = `orbit-chrome-${Math.random().toString(36).substring(2, 7)}`;
  const ringGradId = `orbit-ring-${Math.random().toString(36).substring(2, 7)}`;
  const coreGradId = `orbit-core-${Math.random().toString(36).substring(2, 7)}`;
  const gridPatternId = `orbit-grid-${Math.random().toString(36).substring(2, 7)}`;

  if (!showSquircle) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id={chromeGradId} x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#CBD5E1" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="75%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#F8FAFC" />
          </linearGradient>
          <linearGradient id={ringGradId} x1="10" y1="50" x2="90" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#64748B" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#E2E8F0" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#334155" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id={coreGradId} cx="42" cy="42" r="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="35%" stopColor="#94A3B8" />
            <stop offset="70%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#090D16" />
          </radialGradient>
        </defs>

        {/* Primary Orbital Ring */}
        <ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(-32 50 50)" stroke={`url(#${chromeGradId})`} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        
        {/* Secondary Orbital Ring */}
        <ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(42 50 50)" stroke={`url(#${ringGradId})`} strokeWidth="3" fill="none" opacity="0.85" />

        {/* Central Chrome Singularity Sphere */}
        <circle cx="50" cy="50" r="17" fill={`url(#${coreGradId})`} stroke="#CBD5E1" strokeWidth="1.2" />

        {/* Specular Glint Star */}
        <circle cx="83" cy="30" r="3.5" fill="#FFFFFF" />
        <path d="M 83 20 L 84.5 29 L 93 30 L 84.5 31 L 83 40 L 81.5 31 L 73 30 L 81.5 29 Z" fill="#FFFFFF" opacity="0.95" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <pattern id={gridPatternId} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#22252E" strokeWidth="0.75" />
        </pattern>

        <linearGradient id={chromeGradId} x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#CBD5E1" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="75%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#F8FAFC" />
        </linearGradient>

        <linearGradient id={ringGradId} x1="10" y1="50" x2="90" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#64748B" stopOpacity="0.6" />
          <stop offset="70%" stopColor="#E2E8F0" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#334155" stopOpacity="0.3" />
        </linearGradient>

        <radialGradient id={coreGradId} cx="42" cy="42" r="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="35%" stopColor="#94A3B8" />
          <stop offset="70%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#090D16" />
        </radialGradient>

        <linearGradient id="border-metal" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>

      {/* Dark squircle container with metallic titanium bezel */}
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx="26"
        fill="#0B0D13"
        stroke="url(#border-metal)"
        strokeWidth="1.5"
      />

      {/* Subtle coordinate grid clip inside squircle */}
      <g clipPath="url(#squircle-clip)">
        <rect x="2" y="2" width="96" height="96" rx="26" fill={`url(#${gridPatternId})`} opacity="0.7" />
      </g>

      <clipPath id="squircle-clip">
        <rect x="2" y="2" width="96" height="96" rx="26" />
      </clipPath>

      {/* Primary Orbital Ring */}
      <ellipse cx="50" cy="50" rx="41" ry="16" transform="rotate(-32 50 50)" stroke={`url(#${chromeGradId})`} strokeWidth="4.2" strokeLinecap="round" fill="none" />
      
      {/* Secondary Orbital Ring */}
      <ellipse cx="50" cy="50" rx="41" ry="16" transform="rotate(42 50 50)" stroke={`url(#${ringGradId})`} strokeWidth="2.8" fill="none" opacity="0.85" />

      {/* Central Chrome Singularity Core */}
      <circle cx="50" cy="50" r="17" fill={`url(#${coreGradId})`} stroke="#CBD5E1" strokeWidth="1.2" />

      {/* Specular Star Glint */}
      <circle cx="83" cy="30" r="3.5" fill="#FFFFFF" />
      <path d="M 83 20 L 84.5 29 L 93 30 L 84.5 31 L 83 40 L 81.5 31 L 73 30 L 81.5 29 Z" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
}
