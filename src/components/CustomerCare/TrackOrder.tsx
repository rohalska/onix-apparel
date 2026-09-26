import React, { useState } from 'react';
import { Search, Truck, MapPin, Mail } from 'lucide-react';

interface TrackingData {
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
  status: 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered';
  statusText: string;
  estimatedDelivery: string;
  destination: string;
  items: { title: string; qty: number; price: number }[];
  history: { date: string; time: string; location: string; description: string }[];
}

export const TrackOrder: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<TrackingData | null>(null);

  const sampleDemoOrder: TrackingData = {
    orderNumber: 'ONX-84920',
    carrier: 'FedEx Express (White Glove Signature)',
    trackingNumber: 'FX-940285918234',
    status: 'shipped',
    statusText: 'In Transit — On Schedule',
    estimatedDelivery: 'Thursday, Oct 1 by 4:30 PM',
    destination: 'New York, NY 10022',
    items: [
      { title: 'Mens Cotton Jacket - Khaki Stone (Size: M)', qty: 1, price: 55.99 },
      { title: 'Fjallraven Foldsack No. 1 Backpack', qty: 1, price: 109.95 },
    ],
    history: [
      {
        date: 'Today',
        time: '08:42 AM',
        location: 'Newark Sort Facility, NJ',
        description: 'Departed FedEx sorting hub in transit to local delivery center',
      },
      {
        date: 'Yesterday',
        time: '06:15 PM',
        location: 'Onix Atelier, New York, NY',
        description: 'Package picked up by carrier after quality control inspection',
      },
      {
        date: '2 Days Ago',
        time: '11:20 AM',
        location: 'Onix Atelier, New York, NY',
        description: 'Order confirmed and bespoke packaging prepared',
      },
    ],
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;

    setLoading(true);

    setTimeout(() => {
      setTrackingResult({
        ...sampleDemoOrder,
        orderNumber: orderNumber.trim().toUpperCase(),
      });
      setLoading(false);
    }, 600);
  };

  const handleLoadDemo = () => {
    setOrderNumber('ONX-84920');
    setEmail('tiffany.valentina@example.com');
    setTrackingResult(sampleDemoOrder);
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-900 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
          Order Logistics
        </span>
        <h1 className="text-3xl font-serif font-bold text-slate-900 mt-3 tracking-tight">
          Track Your Order
        </h1>
        <p className="text-sm text-stone-600 mt-2 leading-relaxed">
          Monitor your parcel in real-time from our atelier floor to your doorstep.
        </p>
      </div>

      {/* Helpful Order Number Notice (Explicit User Requirement) */}
      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3 text-amber-950">
        <Mail className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <p className="font-bold text-amber-900">Where do I find my order details?</p>
          <p className="text-amber-800/90 mt-0.5">
            You can find your <strong>Order Number</strong> (e.g. <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono font-bold">ONX-84920</code>) and <strong>Carrier Tracking Number</strong> in the purchase confirmation email sent immediately after you placed your order. Please also check your spam or promotions folders if you cannot locate it in your primary inbox.
          </p>
        </div>
      </div>

      {/* Lookup Form */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        <form onSubmit={handleLookup} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider">
                Order Number *
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. ONX-84920"
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg outline-none focus:border-slate-900 focus:bg-white text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider">
                Billing Email or Phone *
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg outline-none focus:border-slate-900 focus:bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Locating Shipment...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Locate Shipment</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLoadDemo}
              className="text-xs text-stone-500 hover:text-slate-900 underline underline-offset-2 transition-colors"
            >
              Fill Sample Demo Order (ONX-84920)
            </button>
          </div>
        </form>
      </div>

      {/* Tracking Result Display */}
      {trackingResult && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-6 shadow-sm animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-stone-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 font-mono">
                  Order {trackingResult.orderNumber}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {trackingResult.statusText}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Carrier: {trackingResult.carrier} • Tracking: <span className="font-mono text-slate-900 font-semibold">{trackingResult.trackingNumber}</span>
              </p>
            </div>
            <div className="text-right sm:self-center">
              <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block">Estimated Arrival</span>
              <span className="text-sm font-bold text-slate-900">{trackingResult.estimatedDelivery}</span>
            </div>
          </div>

          {/* Progress Timeline Stepper */}
          <div className="py-2">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="space-y-2">
                <div className="w-7 h-7 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  ✓
                </div>
                <span className="text-[11px] font-bold text-slate-900 block">Confirmed</span>
              </div>
              <div className="space-y-2">
                <div className="w-7 h-7 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  ✓
                </div>
                <span className="text-[11px] font-bold text-slate-900 block">Atelier Packed</span>
              </div>
              <div className="space-y-2">
                <div className="w-7 h-7 mx-auto rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold ring-4 ring-amber-100 shadow-sm animate-pulse">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold text-amber-700 block">In Transit</span>
              </div>
              <div className="space-y-2 opacity-40">
                <div className="w-7 h-7 mx-auto rounded-full bg-stone-200 text-stone-500 flex items-center justify-center text-xs font-bold">
                  4
                </div>
                <span className="text-[11px] font-medium text-stone-500 block">Delivered</span>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Recent Shipment Activity
            </h4>
            <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 overflow-hidden text-xs">
              {trackingResult.history.map((event, idx) => (
                <div key={idx} className="p-3 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900">{event.description}</p>
                      <p className="text-[11px] text-stone-500">{event.location}</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-stone-400 sm:text-right shrink-0">
                    <span>{event.date} at {event.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items in parcel */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Pieces in this Shipment
            </h4>
            <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 text-xs">
              {trackingResult.items.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <span className="text-slate-900 font-medium">{item.title}</span>
                  <span className="text-stone-500 font-semibold">Qty: {item.qty} • ${item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
