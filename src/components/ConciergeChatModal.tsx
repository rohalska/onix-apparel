import React, { useState, useEffect } from 'react';
import { Sparkles, X, ShieldCheck, CheckCircle2, Clock, Play, Terminal } from 'lucide-react';
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts';

interface HealthData {
  status: string;
  mode?: string;
  itemCount?: number;
  catalogItemCount?: number;
}

export const ConciergeChatModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchHealth, setSearchHealth] = useState<'loading' | 'live' | 'simulation' | 'offline'>(
    'loading',
  );
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [busReady, setBusReady] = useState(false);
  const [testOutcome, setTestOutcome] = useState<string | null>(null);

  const departmentCount = new Set(FALLBACK_PRODUCTS.map((p) => p.category)).size;
  const displayItemCount = itemCount ?? FALLBACK_PRODUCTS.length;

  const handleCheckBus = () => {
    const hasBus = typeof window !== 'undefined' && Boolean(window.onixStore);
    setBusReady(hasBus);
    return hasBus;
  };

  useEffect(() => {
    if (!isOpen) return;

    let intervalId: NodeJS.Timeout | null = null;

    if (!handleCheckBus()) {
      intervalId = setInterval(() => {
        if (handleCheckBus() && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 250);
    }

    const handleBusReadyEvent = () => {
      if (handleCheckBus() && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('onix:store-ready', handleBusReadyEvent);
      window.addEventListener('focus', handleBusReadyEvent);
    }

    // Check /api/health endpoint dynamically
    setSearchHealth('loading');
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    fetch('/api/health', { signal: controller.signal })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as HealthData;
        const count = data.itemCount ?? data.catalogItemCount;
        if (typeof count === 'number') {
          setItemCount(count);
        }
        if (data.mode === 'live') {
          setSearchHealth('live');
        } else {
          setSearchHealth('simulation');
        }
      })
      .catch(() => {
        if (!active) return;
        setSearchHealth('offline');
      })
      .finally(() => {
        clearTimeout(timeout);
      });

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('onix:store-ready', handleBusReadyEvent);
        window.removeEventListener('focus', handleBusReadyEvent);
      }
      controller.abort();
      clearTimeout(timeout);
    };
  }, [isOpen]);

  const handleTestDispatch = (actionName: 'OPEN_CART' | 'OPEN_PRODUCT') => {
    const hasBus = typeof window !== 'undefined' && Boolean(window.onixStore);
    setBusReady(hasBus);
    if (!hasBus || !window.onixStore) {
      setTestOutcome('Action bus not initialized');
      return;
    }

    if (actionName === 'OPEN_CART') {
      window.onixStore.dispatch({ action: 'OPEN_CART' });
      setTestOutcome('Dispatched OPEN_CART to Action Bus');
    } else if (actionName === 'OPEN_PRODUCT') {
      window.onixStore.dispatch({ action: 'OPEN_PRODUCT', productId: 101 });
      setTestOutcome('Dispatched OPEN_PRODUCT (id: 101) to Action Bus');
    }
  };

  return (
    <>
      {/* Floating Shopping Assistant Launcher (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3.5 bg-slate-900 text-stone-100 rounded-full shadow-2xl hover:bg-slate-800 transition-all duration-300 transform hover:scale-105 border border-amber-500/30 group"
          aria-label="Open AI Shopping Assistant Slot"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <div className="text-left">
            <span className="block font-medium text-xs tracking-wide">AI Shopping Assistant</span>
            <span className="block text-[10px] text-stone-400">Installation Slot Ready</span>
          </div>
        </button>
      )}

      {/* AI Shopping Assistant Modal Drawer */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[440px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-stone-100 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-sm tracking-wide">
                    AI Shopping Assistant
                  </h3>
                  <span className="text-[10px] uppercase font-mono tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                    Slot Ready
                  </span>
                </div>
                <p className="text-[11px] text-stone-400">
                  Google Cloud AI Shopping Agent Integration
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-stone-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              aria-label="Close Assistant Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Staging Body Container */}
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Main Readiness Callout */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Environment Ready for Shopping Agent
              </h4>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                The former simulated mock chat was decommissioned in favor of this production
                integration slot. Direct conversational guidance, catalog exploration, and automated
                cart actions will activate when the Gemini Enterprise backend is connected.
              </p>
            </div>

            {/* Architecture Integration Readiness Checklist (Dynamic live checks) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Integration Readiness Status
                </h5>
                <span className="text-[10px] text-stone-400 font-mono">Live Probing</span>
              </div>
              <div className="space-y-2 text-xs">
                {/* AI Commerce Search Status */}
                <div className="flex items-start gap-2.5 p-2.5 bg-white border border-stone-200 rounded-xl">
                  {searchHealth === 'loading' ? (
                    <Clock className="w-4 h-4 text-stone-400 shrink-0 mt-0.5 animate-spin" />
                  ) : searchHealth === 'live' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : searchHealth === 'offline' ? (
                    <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold text-slate-900">AI Commerce Search:</span>{' '}
                    <span className="text-stone-600">
                      {searchHealth === 'loading' && 'Checking retail service status...'}
                      {searchHealth === 'live' &&
                        'Connected to Google Cloud Retail API (Live Mode).'}
                      {searchHealth === 'simulation' &&
                        `Local Simulation Mode active with ${itemCount !== null ? `${itemCount} indexed items.` : 'indexed catalog.'}`}
                      {searchHealth === 'offline' && 'Offline fallback catalog active.'}
                    </span>
                  </div>
                </div>

                {/* Action Bus Status */}
                <div className="flex items-start gap-2.5 p-2.5 bg-white border border-stone-200 rounded-xl">
                  {busReady ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold text-slate-900">Action Bus Bridge:</span>{' '}
                    <span className="text-stone-600">
                      {busReady ? (
                        'Active & listening on window.onixStore for A2A actions.'
                      ) : (
                        <span>
                          Awaiting window.onixStore mount...
                          <button
                            type="button"
                            onClick={handleCheckBus}
                            className="text-amber-600 hover:text-amber-800 underline font-medium ml-1 cursor-pointer"
                          >
                            Retry
                          </button>
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Multi-Department Catalog Status */}
                <div className="flex items-start gap-2.5 p-2.5 bg-white border border-stone-200 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900">Multi-Department Wares:</span>{' '}
                    <span className="text-stone-600">
                      {displayItemCount} curated products across {departmentCount} departments ready
                      for semantic queries.
                    </span>
                  </div>
                </div>

                {/* Live Agent Service Deployment Status */}
                <div className="flex items-start gap-2.5 p-2.5 bg-amber-50/50 border border-amber-200/60 rounded-xl">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-900">Live Agent Service:</span>{' '}
                    <span className="text-amber-800">
                      Placeholder slot active. Awaiting Gemini Enterprise agent deployment.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Action Bus Trigger */}
            <div className="space-y-2 p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                <Terminal className="w-3.5 h-3.5 text-stone-500" />
                <span>Test Storefront Action Bus</span>
              </div>
              <p className="text-[11px] text-stone-500">
                Verify that external agent action envelopes control the live UI:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleTestDispatch('OPEN_CART')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-medium text-slate-800 hover:bg-stone-100 transition shadow-xs"
                >
                  <Play className="w-3 h-3 text-emerald-600" />
                  <span>Open Cart</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestDispatch('OPEN_PRODUCT')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-medium text-slate-800 hover:bg-stone-100 transition shadow-xs"
                >
                  <Play className="w-3 h-3 text-emerald-600" />
                  <span>View Product</span>
                </button>
              </div>
              {testOutcome && (
                <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 mt-1">
                  &bull; {testOutcome}
                </div>
              )}
            </div>

            {/* Close / Action Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-3 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition"
            >
              Continue Browsing Onix Wares
            </button>
          </div>

          {/* Footer Mount Status */}
          <div className="px-3 py-2 bg-slate-950 text-[10px] text-stone-400 text-center font-mono tracking-tight flex items-center justify-center gap-1.5 border-t border-slate-900">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Storefront Integration Slot &bull; window.onixStore {busReady ? 'Ready' : 'Pending'}
            </span>
          </div>
        </div>
      )}
    </>
  );
};
