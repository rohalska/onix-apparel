import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

declare global {
  interface Window {
    googleAgent?: {
      openChat: () => void;
    };
  }
}

export const ShoppingAgentLauncher: React.FC = () => {
  const [isReady, setIsReady] = useState(
    () => typeof window !== 'undefined' && typeof window.googleAgent?.openChat === 'function',
  );

  useEffect(() => {
    if (isReady) return;

    const intervalId = window.setInterval(() => {
      if (typeof window.googleAgent?.openChat === 'function') {
        setIsReady(true);
      }
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [isReady]);

  return (
    <button
      type="button"
      onClick={() => window.googleAgent?.openChat()}
      disabled={!isReady}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full border border-amber-500/30 bg-slate-900 px-5 py-3.5 text-stone-100 shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-80"
      aria-label={isReady ? 'Open AI Shopping Assistant' : 'Loading AI Shopping Assistant'}
    >
      <Sparkles className="h-5 w-5 text-amber-400" />
      <span className="text-left text-xs font-medium tracking-wide">
        {isReady ? 'AI Shopping Assistant' : 'Loading Assistant...'}
      </span>
    </button>
  );
};
