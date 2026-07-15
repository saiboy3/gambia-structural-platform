import React from 'react';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary:   'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 border border-blue-600',
  secondary: 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200',
  success:   'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 border border-emerald-600',
  danger:    'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20 border border-red-600',
  ghost:     'bg-transparent hover:bg-slate-100 text-slate-500 border border-transparent',
};

const SIZE: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
};

export default function Button({
  variant = 'primary', size = 'md', icon, fullWidth, className = '', children, disabled, ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center font-semibold rounded-lg transition-all
        active:scale-[.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        ${VARIANT[variant]} ${SIZE[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

// ── Icon-only button (table row actions: edit / delete / send) ──────────────
type IconTone = 'default' | 'primary' | 'success' | 'danger';

const ICON_TONE: Record<IconTone, string> = {
  default: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
  primary: 'text-blue-500 hover:text-blue-700 hover:bg-blue-50',
  success: 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50',
  danger:  'text-slate-400 hover:text-red-600 hover:bg-red-50',
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: IconTone;
}

export function IconButton({ tone = 'default', className = '', children, ...rest }: IconButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-all active:scale-90 ${ICON_TONE[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
