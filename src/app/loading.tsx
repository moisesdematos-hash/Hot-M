import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-orange-500/20" />
        <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide animate-pulse">
        A carregar HOT-M...
      </p>
    </div>
  );
}
