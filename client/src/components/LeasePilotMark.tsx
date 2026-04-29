import React from 'react';

interface Props {
  className?: string;
  compact?: boolean;
}

export default function LeasePilotMark({ className = '', compact = false }: Props) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/20 via-sky-500/20 to-indigo-500/20 shadow-[0_10px_30px_rgba(34,211,238,0.18)] backdrop-blur-sm">
        <svg viewBox="0 0 48 48" className="h-6 w-6 text-cyan-200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M11 21.5L24 11l13 10.5V36a1 1 0 0 1-1 1H12a1 1 0 0 1-1-1V21.5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M19 37V26h10v11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M33.5 11.5l1 2.4 2.5 1-2.5 1-1 2.6-1-2.6-2.5-1 2.5-1 1-2.4Z" fill="currentColor" />
        </svg>
      </div>
      {!compact ? (
        <div className="leading-tight">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/80">LeasePilot</div>
          <div className="text-xs text-slate-400">AI-powered resident support</div>
        </div>
      ) : null}
    </div>
  );
}
