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
  const gradientId = `orbit-grad-${Math.random().toString(36).substring(2, 7)}`;
  const meshGradId = `orbit-mesh-${Math.random().toString(36).substring(2, 7)}`;
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
          <linearGradient id={gradientId} x1="15" y1="85" x2="85" y2="25" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="25%" stopColor="#0EA5E9" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="75%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id={meshGradId} x1="50" y1="20" x2="50" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#EAB308" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Sculptural Orbital Arch Glyph */}
        <path
          d="M 22 78 C 24 74, 30 60, 36 44 C 41 31, 44 24, 50 24 C 56 24, 59 31, 64 44 C 70 60, 76 74, 78 78 C 76 81, 71 81, 66 73 C 58 58, 54 48, 50 48 C 46 48, 42 58, 34 73 C 29 81, 24 81, 22 78 Z"
          fill={`url(#${gradientId})`}
        />
        {/* Soft volumetric overlay for spectral depth */}
        <path
          d="M 22 78 C 24 74, 30 60, 36 44 C 41 31, 44 24, 50 24 C 56 24, 59 31, 64 44 C 70 60, 76 74, 78 78 C 76 81, 71 81, 66 73 C 58 58, 54 48, 50 48 C 46 48, 42 58, 34 73 C 29 81, 24 81, 22 78 Z"
          fill={`url(#${meshGradId})`}
          style={{ mixBlendMode: 'screen', opacity: 0.55 }}
        />
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
        {/* Fine background coordinate grid pattern from snippet */}
        <pattern id={gridPatternId} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#26282E" strokeWidth="0.75" />
        </pattern>

        {/* Iridescent spectrum gradient (Blue -> Cyan -> Green -> Orange -> Coral Red) */}
        <linearGradient id={gradientId} x1="15" y1="80" x2="85" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="25%" stopColor="#0EA5E9" />
          <stop offset="48%" stopColor="#10B981" />
          <stop offset="72%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>

        <linearGradient id={meshGradId} x1="50" y1="20" x2="50" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.85" />
          <stop offset="35%" stopColor="#EAB308" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9" />
        </linearGradient>

        {/* Soft crest ambient glow */}
        <radialGradient id="crest-glow" cx="50" cy="28" r="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Dark squircle container matching left example in snippet */}
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx="26"
        fill="#121316"
        stroke="#272930"
        strokeWidth="1.5"
      />

      {/* Subtle coordinate grid clip inside squircle */}
      <g clipPath="url(#squircle-clip)">
        <rect x="2" y="2" width="96" height="96" rx="26" fill={`url(#${gridPatternId})`} opacity="0.8" />
      </g>

      <clipPath id="squircle-clip">
        <rect x="2" y="2" width="96" height="96" rx="26" />
      </clipPath>

      {/* Ambient glow behind crest */}
      <circle cx="50" cy="30" r="25" fill="url(#crest-glow)" />

      {/* Smooth sculptural orbital arch curve (Gaussian wave / trajectory arch) */}
      <path
        d="M 23 76 C 25 72, 31 58, 36 43 C 41 30, 44 24, 50 24 C 56 24, 59 30, 64 43 C 69 58, 75 72, 77 76 C 75 79, 70 79, 65 71 C 58 57, 54 47, 50 47 C 46 47, 42 57, 35 71 C 30 79, 25 79, 23 76 Z"
        fill={`url(#${gradientId})`}
      />

      {/* Sheen & volumetric blend overlay */}
      <path
        d="M 23 76 C 25 72, 31 58, 36 43 C 41 30, 44 24, 50 24 C 56 24, 59 30, 64 43 C 69 58, 75 72, 77 76 C 75 79, 70 79, 65 71 C 58 57, 54 47, 50 47 C 46 47, 42 57, 35 71 C 30 79, 25 79, 23 76 Z"
        fill={`url(#${meshGradId})`}
        style={{ mixBlendMode: 'screen', opacity: 0.55 }}
      />
    </svg>
  );
}
