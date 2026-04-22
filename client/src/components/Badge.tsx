import React from 'react';

type Variant = 'low' | 'medium' | 'high' | 'emergency' | 'default';

const colorMap: Record<Variant, string> = {
  low: 'bg-gray-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  emergency: 'bg-red-600 animate-pulse',
  default: 'bg-gray-500',
};

interface Props {
  label: string;
  variant?: Variant;
  className?: string;
}

export default function Badge({ label, variant = 'default', className = '' }: Props) {
  return (
    <span className={`${colorMap[variant]} text-xs font-medium px-2 py-1 rounded ${className}`}> {label} </span>
  );
}
