import React from 'react';

type Variant = 'low' | 'medium' | 'high' | 'emergency' | 'default' | 'success' | 'info';

const colorMap: Record<Variant, string> = {
  low: 'bg-gray-500/20 text-gray-200 ring-1 ring-gray-400/30',
  medium: 'bg-yellow-500/20 text-yellow-200 ring-1 ring-yellow-400/30',
  high: 'bg-orange-500/20 text-orange-200 ring-1 ring-orange-400/30',
  emergency: 'bg-red-600/20 text-red-200 ring-1 ring-red-400/40',
  success: 'bg-emerald-600/20 text-emerald-200 ring-1 ring-emerald-400/30',
  info: 'bg-sky-600/20 text-sky-200 ring-1 ring-sky-400/30',
  default: 'bg-gray-500/20 text-gray-200 ring-1 ring-gray-400/30',
};

interface Props {
  label: string;
  variant?: Variant;
  className?: string;
}

export default function Badge({ label, variant = 'default', className = '' }: Props) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${colorMap[variant]} ${className}`}>
      {label}
    </span>
  );
}
