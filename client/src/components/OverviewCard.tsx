import React from 'react';

interface Props {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
}

export default function OverviewCard({ title, value, icon, className = '' }: Props) {
  return (
    <div className={`glass p-4 flex items-center space-x-3 ${className}`)}>
      {icon && <div className="text-2xl">{icon}</div>}
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-xl font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}
