import React from 'react';

interface LogoProps {
  /** Rendered width and height in pixels. */
  size?: number;
  className?: string;
}

/**
 * The FairSplit mark: a circle cut along a diagonal, the two halves eased apart.
 * Kept inline so it stays crisp at every size and needs no network request.
 */
export const Logo: React.FC<LogoProps> = ({ size = 32, className = '' }) => (
  <span
    className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-md shadow-emerald-950/40 ${className}`}
    style={{ width: size, height: size }}
  >
    <svg
      viewBox="0 0 1024 1024"
      width={size * 0.68}
      height={size * 0.68}
      role="img"
      aria-label="FairSplit"
    >
      <defs>
        <mask id="fairsplit-upper">
          <rect width="1024" height="1024" fill="#000" />
          <rect x="-512" y="-512" width="2048" height="1024" fill="#fff" transform="rotate(-35 512 512)" />
        </mask>
        <mask id="fairsplit-lower">
          <rect width="1024" height="1024" fill="#000" />
          <rect x="-512" y="512" width="2048" height="1024" fill="#fff" transform="rotate(-35 512 512)" />
        </mask>
      </defs>
      <g fill="#042f2e">
        <circle cx="512" cy="512" r="420" mask="url(#fairsplit-upper)" transform="translate(-32 -46)" />
        <circle cx="512" cy="512" r="420" mask="url(#fairsplit-lower)" transform="translate(32 46)" />
      </g>
    </svg>
  </span>
);
