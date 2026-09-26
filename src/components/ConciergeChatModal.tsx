import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { dispatchAgentAction, AgentActionPayload } from '../services/agentActionBus';
import { Product } from '../types/product';
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts';

interface Message {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: string;
  recommendedProduct?: Product;
  actionPrompt?: {
    label: string;
    action: AgentActionPayload;
  };
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'welcome',
    sender: 'assistant',
    text: "Welcome to Onix Apparel. I am your Gemini-powered Shopping Concierge. I can curate seasonal looks, check store policies, and add items directly to your shopping bag.",
    timestamp: 'Just now',
  },
];

const SUGGESTED_QUERIES = [
  {
    text: "Show me seasonal sale jackets under $60",
    action: { action: 'SEARCH' as const, query: 'jacket' },
  },
  {
    text: "What is your complimentary shipping policy?",
    policyHash: '#shipping',
  },
  {
    text: "Browse Women's Apparel collection",
    action: { action: 'NAVIGATE_COLLECTION' as const, collection: 'women' as const },
  },
  {
    text: "How do your apparel sizes run?",
    policyHash: '#sizing',
  },
];

export const ConciergeChatModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (userText: string) => {
    const text = userText.trim();
    if (!text) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate Gemini Enterprise shopping agent intelligence
    setTimeout(() => {
      setIsTyping(false);
      const lower = text.toLowerCase();

      let replyText = "I've analyzed our catalog for you.";
      let recProd: Product | undefined;
      let actPrompt: { label: string; action: AgentActionPayload } | undefined;

      if (lower.includes('jacket') || lower.includes('coat')) {
        recProd = FALLBACK_PRODUCTS.find((p) => p.id === 3) || FALLBACK_PRODUCTS[2];
        replyText = "Here is our top-rated outerwear: the Mens Cotton Outerwear Jacket ($55.99). It features durable windbreak twill and classic styling.";
        actPrompt = {
          label: "Add Mens Cotton Jacket (M) to Bag",
          action: { action: 'ADD_TO_CART', productId: recProd.id, size: 'M', color: 'Warm Cream' },
        };
      } else if (lower.includes('ship') || lower.includes('delivery')) {
        replyText = "Onix offers complimentary 2-day priority shipping on all orders over $75. Orders placed before 2:00 PM EST ship same-day!";
        actPrompt = {
          label: "View Complimentary Shipping Policy",
          action: { action: 'NAVIGATE_COLLECTION', collection: 'all' as any },
        };
      } else if (lower.includes('return') || lower.includes('refund')) {
        replyText = "We offer a 30-day hassle-free return and exchange window. Pre-paid insured return labels are included with every order.";
      } else if (lower.includes('women') || lower.includes('dress') || lower.includes('t-shirt')) {
        recProd = FALLBACK_PRODUCTS.find((p) => p.id === 18) || FALLBACK_PRODUCTS[17];
        replyText = "From our Women's Collection, I recommend the Opna Moisture Performance Tee ($7.95). Marked down 38% for our seasonal clearance.";
        actPrompt = {
          label: "Add to Bag ($7.95)",
          action: { action: 'ADD_TO_CART', productId: recProd.id, size: 'S', color: 'Onyx Black' },
        };
      } else if (lower.includes('sale') || lower.includes('discount')) {
        replyText = "Our End of Season Sale is live with reductions up to 50% across apparel and fine jewelry.";
        actPrompt = {
          label: "Explore End of Season Sale",
          action: { action: 'NAVIGATE_COLLECTION', collection: 'sale' },
        };
      } else {
        replyText = `I found several stylish matches for "${text}". I have updated your catalog view accordingly!`;
        dispatchAgentAction({ action: 'SEARCH', query: text });
      }

      const botMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedProduct: recProd,
        actionPrompt: actPrompt,
      };

      setMessages((prev) => [...prev, botMsg]);
    }, 600);
  };

  const handleActionClick = (action: AgentActionPayload) => {
    dispatchAgentAction(action);
  };

  return (
    <>
      {/* Floating Concierge Launcher Pill */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3.5 bg-slate-900 text-stone-100 rounded-full shadow-2xl hover:bg-slate-800 transition-all duration-300 transform hover:scale-105 border border-amber-500/30 group"
          aria-label="Open Onix AI Concierge"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <span className="font-medium text-sm tracking-wide">Onix AI Concierge</span>
          <span className="text-[10px] uppercase font-mono tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
            Gemini
          </span>
        </button>
      )}

      {/* Concierge Chat Slide-over Popover */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[600px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-stone-100 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-sm tracking-wide">Onix Concierge</h3>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                </div>
                <p className="text-[11px] text-stone-400 flex items-center gap-1">
                  Gemini Enterprise Ready &bull; A2A Action Bus
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-stone-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              aria-label="Close Concierge"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-stone-200 rounded-bl-xs'
                  }`}
                >
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
                <span className="text-[10px] text-stone-400 mt-1 px-1">{msg.timestamp}</span>

                {/* Recommended Product Micro-Card */}
                {msg.recommendedProduct && (
                  <div className="mt-2 w-[85%] bg-white p-3 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-3">
                    <img
                      src={msg.recommendedProduct.image}
                      alt={msg.recommendedProduct.title}
                      className="w-14 h-14 object-contain rounded-xl bg-stone-50 p-1 border border-stone-100"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-slate-900 truncate">
                        {msg.recommendedProduct.title}
                      </h4>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">
                        ${msg.recommendedProduct.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Autonomous Action Button */}
                {msg.actionPrompt && (
                  <button
                    onClick={() => handleActionClick(msg.actionPrompt!.action)}
                    className="mt-2 flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-medium text-xs rounded-xl shadow-sm transition transform hover:scale-102"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{msg.actionPrompt.label}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 px-4 py-3 bg-white rounded-2xl border border-stone-200 w-20 shadow-sm">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce delay-100" />
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce delay-200" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className="p-3 bg-white border-t border-stone-100 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2">
            {SUGGESTED_QUERIES.map((sq, i) => (
              <button
                key={i}
                onClick={() => {
                  if (sq.policyHash) {
                    window.location.hash = sq.policyHash;
                  } else if (sq.action) {
                    dispatchAgentAction(sq.action);
                  }
                  handleSend(sq.text);
                }}
                className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-full transition shrink-0 border border-stone-200/60"
              >
                {sq.text}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputValue);
            }}
            className="p-3 bg-stone-50 border-t border-stone-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask for styling advice, orders, or policies..."
              className="flex-1 px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-slate-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="p-2.5 bg-slate-900 text-stone-100 rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* FDE Embed Anchor Point Notice */}
          <div className="px-3 py-1 bg-slate-950 text-[10px] text-stone-400 text-center font-mono tracking-tight flex items-center justify-center gap-1.5 border-t border-slate-900">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>FDE Mount Anchor: window.onixStore ready</span>
          </div>
        </div>
      )}
    </>
  );
};
