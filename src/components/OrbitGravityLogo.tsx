import React from 'react';

interface OrbitGravityLogoProps {
  className?: string;
  size?: number;
  variant?: 'squircle' | 'glyph';
}

export const OrbitGravityLogo: React.FC<OrbitGravityLogoProps> = ({
  className = '',
  size = 28,
  variant = 'squircle',
}) => {
  // Unique gradient IDs to prevent collisions
  const gradId = React.useId().replace(/:/g, '');

  if (variant === 'glyph') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
      >
        <defs>
          <linearGradient
            id={`og-grad-${gradId}`}
            x1="4"
            y1="26"
            x2="28"
            y2="6"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="25%" stopColor="#0EA5E9" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="75%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <filter id={`og-glow-${gradId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Glow waveform */}
        <path
          d="M 5 25 C 9 25, 11 23, 13.5 16 C 15 11, 15.5 7, 16 7 C 16.5 7, 17 11, 18.5 16 C 21 23, 23 25, 27 25"
          stroke={`url(#og-grad-${gradId})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.4"
          filter={`url(#og-glow-${gradId})`}
        />

        {/* Primary sculptural orbital waveform */}
        <path
          d="M 5 25 C 9 25, 11 23, 13.5 16 C 15 11, 15.5 7, 16 7 C 16.5 7, 17 11, 18.5 16 C 21 23, 23 25, 27 25"
          stroke={`url(#og-grad-${gradId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Crest Orbital Apex Specular Bead */}
        <circle cx="16" cy="7" r="1.5" fill="#FFF" opacity="0.9" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        {/* Iridescent spectrum gradient: deep azure -> cyan -> emerald -> amber-gold -> coral red */}
        <linearGradient
          id={`og-full-grad-${gradId}`}
          x1="6"
          y1="38"
          x2="42"
          y2="10"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="26%" stopColor="#0EA5E9" />
          <stop offset="52%" stopColor="#10B981" />
          <stop offset="78%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>

        {/* Subtle grid pattern for technical coordinate aesthetic */}
        <pattern
          id={`og-grid-${gradId}`}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 8 0 L 0 0 0 8"
            fill="none"
            stroke="#1d222c"
            strokeWidth="0.75"
          />
        </pattern>

        {/* Volumetric sheen filter */}
        <filter id={`og-sheen-${gradId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Matte charcoal squircle container (#121316) */}
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="12"
        fill="#121316"
        stroke="#272d3b"
        strokeWidth="1.2"
      />

      {/* Technical coordinate grid overlay */}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="10"
        fill={`url(#og-grid-${gradId})`}
        opacity="0.85"
      />

      {/* Center axis guide lines */}
      <line x1="24" y1="8" x2="24" y2="40" stroke="#222834" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="8" y1="34" x2="40" y2="34" stroke="#222834" strokeWidth="1" />

      {/* Ambient glowing waveform */}
      <path
        d="M 8 34 C 14 34, 17 31, 20.5 21 C 22.5 15, 23.4 11, 24 11 C 24.6 11, 25.5 15, 27.5 21 C 31 31, 34 34, 40 34"
        stroke={`url(#og-full-grad-${gradId})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
        filter={`url(#og-sheen-${gradId})`}
      />

      {/* Sculptural orbital gravity trajectory arch (Gaussian curve) */}
      <path
        d="M 8 34 C 14 34, 17 31, 20.5 21 C 22.5 15, 23.4 11, 24 11 C 24.6 11, 25.5 15, 27.5 21 C 31 31, 34 34, 40 34"
        stroke={`url(#og-full-grad-${gradId})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Crest specular volumetric highlight */}
      <circle cx="24" cy="11" r="2.2" fill="#FFFFFF" opacity="0.95" />
      <circle cx="24" cy="11" r="4" fill="#EF4444" opacity="0.25" />
    </svg>
  );
};
