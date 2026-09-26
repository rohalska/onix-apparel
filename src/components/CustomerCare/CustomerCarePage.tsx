import React from 'react';
import { Truck, RotateCcw, Ruler, PackageSearch, Headset, ShieldCheck, ChevronRight, ArrowLeft } from 'lucide-react';
import { ShippingPolicy } from './ShippingPolicy';
import { ReturnsPolicy } from './ReturnsPolicy';
import { SizingGuide } from './SizingGuide';
import { TrackOrder } from './TrackOrder';
import { ContactClientServices } from './ContactClientServices';
import { PrivacyPolicy } from './PrivacyPolicy';

export type CustomerCareSection = 'shipping' | 'returns' | 'sizing' | 'order-lookup' | 'contact' | 'privacy';

interface CustomerCarePageProps {
  currentSection: CustomerCareSection;
  onNavigate: (section: CustomerCareSection) => void;
  onBackToShop: () => void;
}

export const CustomerCarePage: React.FC<CustomerCarePageProps> = ({
  currentSection,
  onNavigate,
  onBackToShop,
}) => {
  const navItems = [
    {
      id: 'shipping' as CustomerCareSection,
      label: 'Complimentary Shipping',
      icon: Truck,
      hash: '#shipping',
    },
    {
      id: 'returns' as CustomerCareSection,
      label: '30-Day Easy Returns',
      icon: RotateCcw,
      hash: '#returns',
    },
    {
      id: 'sizing' as CustomerCareSection,
      label: 'Apparel Sizing Guide',
      icon: Ruler,
      hash: '#sizing',
    },
    {
      id: 'order-lookup' as CustomerCareSection,
      label: 'Track Your Order',
      icon: PackageSearch,
      hash: '#order-lookup',
    },
    {
      id: 'contact' as CustomerCareSection,
      label: 'Contact Client Services',
      icon: Headset,
      hash: '#contact',
    },
    {
      id: 'privacy' as CustomerCareSection,
      label: 'Privacy Policy & Terms',
      icon: ShieldCheck,
      hash: '#privacy',
    },
  ];

  const activeItem = navItems.find((item) => item.id === currentSection) || navItems[0];

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Breadcrumb & Return to Shop Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
          <nav className="flex items-center gap-2 text-xs text-stone-500">
            <button
              onClick={onBackToShop}
              className="hover:text-slate-900 transition-colors font-medium"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-700 font-medium">Customer Care</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-slate-900 font-bold">{activeItem.label}</span>
          </nav>

          <button
            onClick={onBackToShop}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 bg-white border border-stone-300 hover:border-slate-800 hover:bg-stone-50 px-4 py-2 rounded-lg transition-colors self-start sm:self-auto shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Shopping</span>
          </button>
        </div>

        {/* Main Content Layout: Sidebar + Active Page */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Customer Care Navigation Sidebar */}
          <aside className="lg:col-span-1 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 px-3 pb-1">
              Customer Services
            </h3>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === currentSection;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all text-left ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-stone-700 hover:bg-stone-100 hover:text-slate-900 border border-stone-200/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-stone-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Concierge Help Box */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 mt-6 space-y-2">
              <h4 className="text-xs font-bold text-amber-950 font-serif">Need Personal Assistance?</h4>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Our client concierge team is on hand 7 days a week for immediate styling & order support.
              </p>
              <button
                onClick={() => onNavigate('contact')}
                className="text-xs font-bold text-amber-900 underline underline-offset-2 hover:text-amber-950 block pt-1"
              >
                Connect with Concierge &rarr;
              </button>
            </div>
          </aside>

          {/* Active Customer Care Content Container */}
          <main className="lg:col-span-3 bg-white border border-stone-200 rounded-2xl p-6 sm:p-10 shadow-xs">
            {currentSection === 'shipping' && <ShippingPolicy />}
            {currentSection === 'returns' && <ReturnsPolicy />}
            {currentSection === 'sizing' && <SizingGuide />}
            {currentSection === 'order-lookup' && <TrackOrder />}
            {currentSection === 'contact' && <ContactClientServices />}
            {currentSection === 'privacy' && <PrivacyPolicy />}
          </main>
        </div>
      </div>
    </div>
  );
};
