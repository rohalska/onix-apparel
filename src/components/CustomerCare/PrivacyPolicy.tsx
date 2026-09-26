import React from 'react';
import { ShieldCheck, Eye, Sparkles, Cpu, Lock, CheckCircle2 } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="space-y-8 text-stone-800">
      {/* Header */}
      <div className="space-y-2 border-b border-stone-200 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold tracking-wide uppercase">
          <ShieldCheck className="w-3.5 h-3.5" />
          Transparency & Responsible AI Governance
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Privacy Policy, Terms & AI Transparency
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-3xl">
          ONIX Apparel is committed to safeguarding customer data, upholding strict responsible AI governance standards, and providing complete clarity regarding data usage within our Google Cloud-powered commerce ecosystem.
        </p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-slate-800 shadow-xs">
            <Eye className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Anonymous Telemetry
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            We utilize persistent pseudonymous session tokens (<code className="text-[11px] bg-stone-200 px-1 py-0.5 rounded">onix_visitor_id</code>) stored solely in your local browser storage to personalize search ranking without harvesting PII.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-slate-800 shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Gemini Concierge Transparency
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Our AI Concierge is powered by Google Gemini Enterprise. Dialogue is processed strictly to assist with catalog discovery, sizing consultation, and autonomous bag actions.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-slate-800 shadow-xs">
            <Lock className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Sandbox Payment Security
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            ONIX is a demonstrator showcase. No real credit card, banking, or financial account information is ever transmitted, charged, or retained.
          </p>
        </div>
      </div>

      {/* Detailed Policy Sections */}
      <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-stone-700">
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
            1. Information Collection & Telemetry Architecture
          </h2>
          <p>
            When engaging with the ONIX storefront, the platform interacts with Google Cloud Vertex AI Search for Retail to provide vector search and machine-learned recommendations. In accordance with the Google Cloud Quality Flywheel:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li>
              <strong className="text-stone-800">Browsing Telemetry:</strong> An anonymous visitor identifier is randomly generated and retained in your browser's <code className="text-xs bg-stone-100 px-1 py-0.5 rounded">localStorage</code> to correlate search intent across page sessions.
            </li>
            <li>
              <strong className="text-stone-800">Event Logging:</strong> User interactions including item inspection (<code className="text-xs bg-stone-100 px-1 py-0.5 rounded">detail-page-view</code>), bag additions (<code className="text-xs bg-stone-100 px-1 py-0.5 rounded">add-to-cart</code>), and order completions (<code className="text-xs bg-stone-100 px-1 py-0.5 rounded">purchase-complete</code>) are relayed to Vertex AI to optimize facet accuracy.
            </li>
            <li>
              <strong className="text-stone-800">No Third-Party Ad Trackers:</strong> We do not deploy third-party advertising cookies, cross-site pixels, or data-broker trackers.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
            2. Responsible Artificial Intelligence (AI) Principles
          </h2>
          <p>
            In alignment with the Google Responsible AI Framework and EU AI Act transparency obligations:
          </p>
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-950">
            <div className="flex items-center gap-2 font-bold">
              <Cpu className="w-4 h-4 text-amber-700" />
              AI Assistant Disclosure
            </div>
            <p>
              The ONIX AI Concierge is an automated conversational system powered by Google Gemini large language models. It provides styling guidance, product recommendations, and cart automation. Outputs are generated probabilistically and should be verified prior to completing any order.
            </p>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li>Customer conversations are never used to train global public foundational models without explicit enterprise consent.</li>
            <li>The Concierge does not make autonomous contractual or binding financial commitments.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
            3. Simulated Commerce Disclaimer & Terms of Use
          </h2>
          <p>
            By accessing or interacting with ONIX Apparel, you acknowledge and agree that:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li>
              <strong className="text-stone-800">Demonstration Showcase:</strong> This web application is deployed as a high-fidelity demonstration platform showcasing Google Cloud Vertex AI and Gemini Enterprise Agent integration.
            </li>
            <li>
              <strong className="text-stone-800">Zero Financial Liability:</strong> No commercial transactions are completed, and no physical merchandise will be dispatched from simulated checkouts.
            </li>
            <li>
              <strong className="text-stone-800">Synthetic & Open Catalog:</strong> Product imagery and initial descriptions are provided through the open-source Fake Store API for demonstration fidelity.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
            4. User Rights, Data Control & Erasure
          </h2>
          <p>
            You retain absolute sovereignty over your local browsing session. You may reset your shopping bag, wishlist, and anonymous telemetry identifier at any time:
          </p>
          <div className="p-4 bg-stone-100 rounded-xl space-y-2 text-xs">
            <p className="font-mono text-stone-800">
              Browser Console: <code className="bg-stone-200 px-1 py-0.5 rounded">localStorage.clear(); window.location.reload();</code>
            </p>
            <p className="text-stone-600">
              For enterprise inquiries, privacy compliance queries, or data deletion requests, contact our legal team at <a href="mailto:privacy@onix-apparel.com" className="text-slate-900 font-bold underline underline-offset-2">privacy@onix-apparel.com</a>.
            </p>
          </div>
        </section>
      </div>

      {/* Compliance Stamp */}
      <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-stone-500">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Last Reviewed: September 2026 | Google Cloud Enterprise Ready</span>
        </div>
        <div className="text-[11px] text-stone-400">
          Complies with Google Cloud Acceptable Use & AI Safety Guidelines
        </div>
      </div>
    </div>
  );
};
