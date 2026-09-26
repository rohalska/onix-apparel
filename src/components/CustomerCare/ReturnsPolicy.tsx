import React from 'react';
import { RotateCcw, CheckCircle2, ArrowRight } from 'lucide-react';

export const ReturnsPolicy: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          Risk-Free Shopping
        </span>
        <h1 className="text-3xl font-serif font-bold text-slate-900 mt-3 tracking-tight">
          30-Day Easy Returns & Exchanges
        </h1>
        <p className="text-sm text-stone-600 mt-2 leading-relaxed">
          We want you to love everything you purchase from Onix Apparel. If a piece does not fit or meet your expectations, we gladly accept returns and exchanges within 30 days of receipt.
        </p>
      </div>

      {/* Step by Step Process */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 font-serif">How to Initiate a Return</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">1</span>
            <h4 className="text-xs font-bold text-slate-900">Start Online</h4>
            <p className="text-xs text-stone-500">Visit our Returns Portal with your Order ID and shipping zip code.</p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">2</span>
            <h4 className="text-xs font-bold text-slate-900">Print Label</h4>
            <p className="text-xs text-stone-500">Generate a complimentary pre-paid digital label or QR drop-off code.</p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">3</span>
            <h4 className="text-xs font-bold text-slate-900">Pack & Drop</h4>
            <p className="text-xs text-stone-500">Place items in the original box with tags intact and hand to carrier.</p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">4</span>
            <h4 className="text-xs font-bold text-slate-900">Fast Refund</h4>
            <p className="text-xs text-stone-500">Refund issued to original payment within 3–5 days of facility intake.</p>
          </div>
        </div>
      </div>

      {/* Return Eligibility Guidelines */}
      <div className="border border-stone-200 rounded-xl p-5 bg-white space-y-4">
        <h3 className="text-base font-bold text-slate-900 font-serif">Item Eligibility Requirements</h3>
        <ul className="space-y-3 text-xs text-stone-600">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong className="text-slate-900">Unworn & Unaltered:</strong> Items must be in brand new, unwashed condition with no perfume, makeup, or deodorant marks.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong className="text-slate-900">Original Security Tags:</strong> All designer hangtags, security ribbons, and packaging dust bags must remain intact.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span><strong className="text-slate-900">Fine Jewelry & Rings:</strong> Must be returned in the original velvet box with authenticity certificate cards included.</span>
          </li>
        </ul>
      </div>

      {/* Direct Exchange Highlight */}
      <div className="p-5 rounded-xl bg-stone-100 border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-slate-900" />
            Looking to exchange for a different size?
          </h4>
          <p className="text-xs text-stone-600">
            Exchanges are 100% free with no restocking fee. We immediately dispatch your replacement size as soon as your return is scanned.
          </p>
        </div>
        <a
          href="#sizing"
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold whitespace-nowrap hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
        >
          <span>View Sizing Chart</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
