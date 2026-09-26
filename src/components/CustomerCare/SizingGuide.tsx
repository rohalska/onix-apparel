import React, { useState } from 'react';
import { Ruler } from 'lucide-react';

type Unit = 'in' | 'cm';
type GenderTab = 'womens' | 'mens' | 'jewelry';

export const SizingGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<GenderTab>('womens');
  const [unit, setUnit] = useState<Unit>('in');

  const convert = (inches: number): string => {
    if (unit === 'in') return `${inches}"`;
    return `${Math.round(inches * 2.54)} cm`;
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-900 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
          Fit & Measurements
        </span>
        <h1 className="text-3xl font-serif font-bold text-slate-900 mt-3 tracking-tight">
          Apparel & Jewelry Sizing Guide
        </h1>
        <p className="text-sm text-stone-600 mt-2 leading-relaxed">
          Find your flawless silhouette. Our garments are tailored to international luxury ready-to-wear standards. Use our size conversion and body measurement tables below.
        </p>
      </div>

      {/* Tab Switcher & Unit Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('womens')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'womens'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
            }`}
          >
            Women's Collection
          </button>
          <button
            onClick={() => setActiveTab('mens')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'mens'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
            }`}
          >
            Men's Collection
          </button>
          <button
            onClick={() => setActiveTab('jewelry')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'jewelry'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
            }`}
          >
            Fine Jewelry & Rings
          </button>
        </div>

        {/* Unit Toggle */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200 self-start sm:self-auto">
          <button
            onClick={() => setUnit('in')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              unit === 'in' ? 'bg-white text-slate-900 shadow-xs' : 'text-stone-500 hover:text-slate-900'
            }`}
          >
            Inches (in)
          </button>
          <button
            onClick={() => setUnit('cm')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              unit === 'cm' ? 'bg-white text-slate-900 shadow-xs' : 'text-stone-500 hover:text-slate-900'
            }`}
          >
            Centimeters (cm)
          </button>
        </div>
      </div>

      {/* Women's Table */}
      {activeTab === 'womens' && (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 uppercase tracking-wider font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">US Numeric</th>
                  <th className="py-3 px-4">Bust</th>
                  <th className="py-3 px-4">Natural Waist</th>
                  <th className="py-3 px-4">Hips</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">XS</td>
                  <td className="py-3 px-4 text-stone-600">0 – 2</td>
                  <td className="py-3 px-4">{convert(32)} – {convert(33)}</td>
                  <td className="py-3 px-4">{convert(24)} – {convert(25)}</td>
                  <td className="py-3 px-4">{convert(34)} – {convert(35)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">S</td>
                  <td className="py-3 px-4 text-stone-600">4 – 6</td>
                  <td className="py-3 px-4">{convert(34)} – {convert(35)}</td>
                  <td className="py-3 px-4">{convert(26)} – {convert(27)}</td>
                  <td className="py-3 px-4">{convert(36)} – {convert(37)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">M</td>
                  <td className="py-3 px-4 text-stone-600">8 – 10</td>
                  <td className="py-3 px-4">{convert(36)} – {convert(37)}</td>
                  <td className="py-3 px-4">{convert(28)} – {convert(29)}</td>
                  <td className="py-3 px-4">{convert(38)} – {convert(39)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">L</td>
                  <td className="py-3 px-4 text-stone-600">12 – 14</td>
                  <td className="py-3 px-4">{convert(38.5)} – {convert(40)}</td>
                  <td className="py-3 px-4">{convert(30.5)} – {convert(32)}</td>
                  <td className="py-3 px-4">{convert(40.5)} – {convert(42)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">XL</td>
                  <td className="py-3 px-4 text-stone-600">16</td>
                  <td className="py-3 px-4">{convert(41.5)} – {convert(43)}</td>
                  <td className="py-3 px-4">{convert(33.5)} – {convert(35)}</td>
                  <td className="py-3 px-4">{convert(43.5)} – {convert(45)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Men's Table */}
      {activeTab === 'mens' && (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 uppercase tracking-wider font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Chest</th>
                  <th className="py-3 px-4">Waist</th>
                  <th className="py-3 px-4">Neck</th>
                  <th className="py-3 px-4">Sleeve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">XS</td>
                  <td className="py-3 px-4">{convert(34)} – {convert(36)}</td>
                  <td className="py-3 px-4">{convert(28)} – {convert(30)}</td>
                  <td className="py-3 px-4">{convert(14)} – {convert(14.5)}</td>
                  <td className="py-3 px-4">{convert(32)} – {convert(32.5)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">S</td>
                  <td className="py-3 px-4">{convert(36)} – {convert(38)}</td>
                  <td className="py-3 px-4">{convert(30)} – {convert(32)}</td>
                  <td className="py-3 px-4">{convert(14.5)} – {convert(15)}</td>
                  <td className="py-3 px-4">{convert(32.5)} – {convert(33)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">M</td>
                  <td className="py-3 px-4">{convert(38)} – {convert(40)}</td>
                  <td className="py-3 px-4">{convert(32)} – {convert(34)}</td>
                  <td className="py-3 px-4">{convert(15)} – {convert(15.5)}</td>
                  <td className="py-3 px-4">{convert(33.5)} – {convert(34)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">L</td>
                  <td className="py-3 px-4">{convert(42)} – {convert(44)}</td>
                  <td className="py-3 px-4">{convert(36)} – {convert(38)}</td>
                  <td className="py-3 px-4">{convert(16)} – {convert(16.5)}</td>
                  <td className="py-3 px-4">{convert(34.5)} – {convert(35)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">XL</td>
                  <td className="py-3 px-4">{convert(46)} – {convert(48)}</td>
                  <td className="py-3 px-4">{convert(40)} – {convert(42)}</td>
                  <td className="py-3 px-4">{convert(17)} – {convert(17.5)}</td>
                  <td className="py-3 px-4">{convert(35.5)} – {convert(36)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">XXL</td>
                  <td className="py-3 px-4">{convert(50)} – {convert(52)}</td>
                  <td className="py-3 px-4">{convert(44)} – {convert(46)}</td>
                  <td className="py-3 px-4">{convert(18)} – {convert(18.5)}</td>
                  <td className="py-3 px-4">{convert(36.5)} – {convert(37)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Jewelry Table */}
      {activeTab === 'jewelry' && (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 uppercase tracking-wider font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">US Ring Size</th>
                  <th className="py-3 px-4">Inside Circumference</th>
                  <th className="py-3 px-4">Inside Diameter</th>
                  <th className="py-3 px-4">UK / AU Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Size 5</td>
                  <td className="py-3 px-4">49.3 mm</td>
                  <td className="py-3 px-4">15.7 mm</td>
                  <td className="py-3 px-4 text-stone-600">J ½</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Size 6</td>
                  <td className="py-3 px-4">51.9 mm</td>
                  <td className="py-3 px-4">16.5 mm</td>
                  <td className="py-3 px-4 text-stone-600">L ½</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Size 7</td>
                  <td className="py-3 px-4">54.4 mm</td>
                  <td className="py-3 px-4">17.3 mm</td>
                  <td className="py-3 px-4 text-stone-600">N ½</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Size 8</td>
                  <td className="py-3 px-4">57.0 mm</td>
                  <td className="py-3 px-4">18.1 mm</td>
                  <td className="py-3 px-4 text-stone-600">P ½</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Size 9</td>
                  <td className="py-3 px-4">59.5 mm</td>
                  <td className="py-3 px-4">19.0 mm</td>
                  <td className="py-3 px-4 text-stone-600">R ½</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* How to Measure Section */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-4">
        <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
          <Ruler className="w-4 h-4 text-slate-900" />
          How to Measure Accurately
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-600">
          <div className="space-y-1">
            <h5 className="font-bold text-slate-900">1. Chest / Bust</h5>
            <p>Measure around the fullest part of your chest, keeping the tape level under your arms and across shoulder blades.</p>
          </div>
          <div className="space-y-1">
            <h5 className="font-bold text-slate-900">2. Natural Waist</h5>
            <p>Measure around your natural waistline, which is the narrowest point of your torso, usually about 1 inch above the navel.</p>
          </div>
          <div className="space-y-1">
            <h5 className="font-bold text-slate-900">3. Hips</h5>
            <p>Stand with feet together and measure around the fullest point of your hips and seat (approximately 8 inches below your waist).</p>
          </div>
        </div>
      </div>
    </div>
  );
};
