import React from 'react';

interface Props {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
  subtitle?: string;
}

export default function OverviewCard({ title, value, icon, className = '', subtitle }: Props) {
  return (
    <div
      className={`glass group relative overflow-hidden rounded-3xl p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:shadow-[0_24px_70px_rgba(8,47,73,0.35)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_30%)] opacity-80" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          {subtitle ? <p className="mt-2 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        {icon ? (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-100 shadow-[0_12px_28px_rgba(34,211,238,0.12)]">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
