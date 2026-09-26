import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Sparkles } from 'lucide-react';

export const ContactClientServices: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Order Inquiries & Tracking',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSubmitted(true);
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-900 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
          Client Care & Concierge
        </span>
        <h1 className="text-3xl font-serif font-bold text-slate-900 mt-3 tracking-tight">
          Contact Client Services
        </h1>
        <p className="text-sm text-stone-600 mt-2 leading-relaxed">
          Our dedicated client advisors are here to assist with styling consultations, order tracking, bespoke inquiries, and aftercare.
        </p>
      </div>

      {/* Contact Channels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Email */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
          <div className="p-2 w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Email Concierge</h4>
          <a
            href="mailto:concierge@onixapparel.com"
            className="text-xs font-semibold text-slate-900 hover:text-amber-800 transition-colors block"
          >
            concierge@onixapparel.com
          </a>
          <p className="text-[11px] text-stone-500">Response within 4 hours</p>
        </div>

        {/* Telephone */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
          <div className="p-2 w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <Phone className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Toll-Free Phone</h4>
          <a
            href="tel:+18005556649"
            className="text-xs font-semibold text-slate-900 hover:text-amber-800 transition-colors block"
          >
            +1 (800) 555-ONIX (6649)
          </a>
          <p className="text-[11px] text-stone-500">Mon–Fri 8 AM – 9 PM EST</p>
        </div>

        {/* New York Flagship */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
          <div className="p-2 w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Onix Flagship Atelier</h4>
          <p className="text-xs font-semibold text-slate-900">450 Madison Avenue</p>
          <p className="text-[11px] text-stone-500">New York, NY 10022</p>
        </div>

        {/* Beverly Hills Suite */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
          <div className="p-2 w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Beverly Hills Salon</h4>
          <p className="text-xs font-semibold text-slate-900">9500 Wilshire Blvd</p>
          <p className="text-[11px] text-stone-500">Beverly Hills, CA 90212</p>
        </div>
      </div>

      {/* Interactive Contact Form */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        {submitted ? (
          <div className="py-10 text-center space-y-3 animate-fade-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-serif">Inquiry Received with Distinction</h3>
            <p className="text-xs text-stone-600 max-w-md mx-auto">
              Thank you, {formData.name}. An Onix client advisor has received your message regarding "{formData.subject}" and will respond to <span className="font-semibold text-slate-900">{formData.email}</span> shortly.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({ name: '', email: '', subject: 'Order Inquiries & Tracking', message: '' });
              }}
              className="mt-4 px-4 py-2 bg-stone-100 text-slate-800 text-xs font-bold rounded-lg hover:bg-stone-200 transition-colors"
            >
              Send Another Inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-serif">Send an Inquiry to Our Client Advisors</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Tiffany Valentina"
                  className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg outline-none focus:border-slate-900 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg outline-none focus:border-slate-900 focus:bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider">
                Inquiry Topic
              </label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg outline-none focus:border-slate-900 focus:bg-white text-slate-900"
              >
                <option value="Order Inquiries & Tracking">Order Inquiries & Tracking</option>
                <option value="Returns & Exchanges Assistance">Returns & Exchanges Assistance</option>
                <option value="Private Styling & Fit Consultation">Private Styling & Fit Consultation</option>
                <option value="Fine Jewelry & Custom Ring Sizing">Fine Jewelry & Custom Ring Sizing</option>
                <option value="Wholesale, Press & Partnerships">Wholesale, Press & Partnerships</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider">
                Message *
              </label>
              <textarea
                required
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="How may our advisors assist you today?"
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg outline-none focus:border-slate-900 focus:bg-white text-slate-900 resize-none"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Message</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
