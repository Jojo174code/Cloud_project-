import React from 'react';

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  className?: string;
}

export default function TextArea({ label, className = '', ...rest }: Props) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm text-gray-300">{label}</label>}
      <textarea
        className={`w-full rounded-md bg-gray-800/50 border border-gray-600 px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500 ${className}`}
        {...rest}
      />
    </div>
  );
}
