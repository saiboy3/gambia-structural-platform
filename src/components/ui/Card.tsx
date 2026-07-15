import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export default function Card({ title, children, className = '', actions }: CardProps) {
  return (
    <div className={`relative bg-white rounded-2xl shadow-sm border border-slate-200/80 ${className}`}>
      {(title || actions) && (
        <div className="relative flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />
          {title && <h3 className="font-semibold text-slate-800 text-sm tracking-tight pl-2.5">{title}</h3>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
