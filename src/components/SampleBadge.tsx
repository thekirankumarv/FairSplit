import React from 'react';
import { FlaskConical } from 'lucide-react';

/**
 * Marks the example trip the app ships with, so nobody mistakes the seeded
 * numbers for their own.
 */
export const SampleBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    title="Example data included with the app"
    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-amber-500/15 border border-amber-500/30 text-amber-400 ${className}`}
  >
    <FlaskConical size={9} />
    Sample
  </span>
);
