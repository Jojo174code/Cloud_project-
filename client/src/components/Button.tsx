import React from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: Props) {
  const base = 'rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-500',
    secondary: 'bg-gray-700 text-gray-200 hover:bg-gray-600',
    icon: 'bg-transparent p-1',
  }[variant];
  const sizes = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }[size];
  return (
    <button className={`${base} ${variants} ${sizes} ${className}`} {...rest}>
      {children}
    </button>
  );
}
