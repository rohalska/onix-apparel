import React from 'react';
import { Truck, ShieldCheck, Clock, AlertCircle } from 'lucide-react';

export const ShippingPolicy: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          Delivery & Logistics
        </span>
        <h1 className="text-3xl font-serif font-bold text-slate-900 mt-3 tracking-tight">
          Complimentary Shipping Policy
        </h1>
        <p className="text-sm text-stone-600 mt-2 leading-relaxed">
          At Onix Apparel, every piece is handled with meticulous care and dispatched from our temperature-controlled atelier in sustainable, signature packaging.
        </p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-lg shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Free Over $75</h4>
            <p className="text-xs text-stone-500 mt-0.5">Complimentary standard ground on all domestic orders over $75.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-lg shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Fast Dispatch</h4>
            <p className="text-xs text-stone-500 mt-0.5">Orders placed before 1:00 PM EST ship within 1–2 business days.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-lg shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Insured Delivery</h4>
            <p className="text-xs text-stone-500 mt-0.5">Full transit insurance and tracking included on every parcel.</p>
          </div>
        </div>
      </div>

      {/* Shipping Rates Table */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 font-serif">Domestic Delivery Tiers</h3>
        <div className="overflow-x-auto border border-stone-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-700 uppercase tracking-wider font-semibold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Service Tier</th>
                <th className="py-3 px-4">Estimated Transit Time</th>
                <th className="py-3 px-4">Cost (Orders $75+)</th>
                <th className="py-3 px-4">Cost (Orders Under $75)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900">Standard Ground</td>
                <td className="py-3.5 px-4 text-stone-600">3–5 Business Days</td>
                <td className="py-3.5 px-4 font-bold text-emerald-700">COMPLIMENTARY</td>
                <td className="py-3.5 px-4 text-stone-800">$5.95 Flat Rate</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900">Expedited 2-Day Air</td>
                <td className="py-3.5 px-4 text-stone-600">2 Business Days</td>
                <td className="py-3.5 px-4 text-stone-800">$15.00</td>
                <td className="py-3.5 px-4 text-stone-800">$15.00</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900">Priority Next-Day Overnight</td>
                <td className="py-3.5 px-4 text-stone-600">Next Business Day (by 3 PM)</td>
                <td className="py-3.5 px-4 text-stone-800">$25.00</td>
                <td className="py-3.5 px-4 text-stone-800">$25.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Packaging & Signature */}
      <div className="space-y-4 text-xs text-stone-600 leading-relaxed">
        <h3 className="text-base font-bold text-slate-900 font-serif">Signature Packaging & Delivery Standards</h3>
        <p>
          All apparel items arrive wrapped in breathable, unbleached tissue within our 100% recyclable FSC-certified keepsake box. Fine jewelry orders are housed in our velvet-lined hard presentation case and require an adult signature upon delivery for high-value protection.
        </p>

        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 flex items-start gap-3 mt-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs">
            <span className="font-bold">Holiday & Capsule Peak Surcharge Notice:</span> During peak collection drops, order handling may take up to 48 hours before carrier dispatch. You will receive real-time courier tracking as soon as your label is generated.
          </p>
        </div>
      </div>
    </div>
  );
};
