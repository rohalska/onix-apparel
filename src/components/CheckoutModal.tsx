import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, Lock, CreditCard, Truck, ArrowLeft, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';
import { trackVertexUserEvent } from '../services/vertexSearch';
import { OrderDetails } from '../types/product';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const { cart, subtotal, discount, shipping, tax, total, clearCart } = useCart();

  const [step, setStep] = useState<'shipping' | 'payment' | 'success'>('shipping');
  const [formData, setFormData] = useState({
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    address: '742 Evergreen Terrace',
    city: 'Springfield',
    postalCode: '97477',
    country: 'United States',
    cardNumber: '•••• •••• •••• 4242',
    cardExp: '12/28',
    cardCvc: '123',
  });

  const [completedOrder, setCompletedOrder] = useState<OrderDetails | null>(null);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const handleCompleteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const orderId = `ONX-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder: OrderDetails = {
      orderId,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      items: [...cart],
      subtotal,
      discount,
      shipping,
      tax,
      total,
      customer: {
        fullName: formData.fullName,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country,
      },
    };

    setCompletedOrder(newOrder);
    setStep('success');

    // Track purchase-complete user events in Vertex AI Commerce Search
    cart.forEach((item) => {
      trackVertexUserEvent('purchase-complete', item.product, {
        quantity: item.quantity,
        size: item.selectedSize,
        color: item.selectedColor,
        orderId,
      });
    });

    clearCart();

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#0f172a', '#b88c70', '#e2e8f0', '#fbbf24', '#10b981'],
      });
    } catch (err) {
      console.log('Confetti effect:', err);
    }
  };

  const handleResetAndClose = () => {
    setStep('shipping');
    setCompletedOrder(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm transition-opacity"
        onClick={step === 'success' ? handleResetAndClose : onClose}
      />

      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 z-10 animate-fade-in my-8">
        {/* Top Header */}
        <div className="p-6 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <h2 className="text-xl font-serif font-bold text-slate-900">
              {step === 'success' ? 'Order Confirmation' : 'Express Checkout'}
            </h2>
            <p className="text-xs text-stone-500">
              {step === 'shipping' && 'Step 1 of 2: Shipping & Delivery Information'}
              {step === 'payment' && 'Step 2 of 2: Secure Payment Method'}
              {step === 'success' && 'Thank you for your purchase!'}
            </p>
          </div>
          <button
            onClick={step === 'success' ? handleResetAndClose : onClose}
            className="p-2 text-stone-400 hover:text-black rounded-full hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
          {step === 'shipping' && (
            <form onSubmit={handleProceedToPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-slate-800"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    required
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-slate-800"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    required
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              {/* Delivery method options */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                  Delivery Method
                </label>
                <div className="border border-stone-200 rounded-xl p-3 bg-stone-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-slate-800" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {shipping === 0 ? 'Free Standard Express' : 'Standard Shipping'}
                      </p>
                      <p className="text-[11px] text-stone-500">Delivered within 3-5 business days</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* Order total snapshot */}
              <div className="pt-4 flex items-center justify-between border-t border-stone-200">
                <div>
                  <span className="text-xs text-stone-500">Total to pay</span>
                  <p className="text-xl font-bold text-slate-900">${total.toFixed(2)}</p>
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  Continue to Payment
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {step === 'payment' && (
            <form onSubmit={handleCompleteOrder} className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">Demo Sandbox Environment</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    This is a simulated retail store for Google Cloud & Gemini Enterprise demonstration. No real credit card or financial data is accepted, collected, or processed.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                    Simulated Demo Payment Card
                  </label>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-stone-200 text-stone-700 rounded-full">
                    Preloaded Test Card
                  </span>
                </div>
                <div>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="text"
                      name="cardNumber"
                      readOnly
                      value="•••• •••• •••• 4242 (Demo Test Card)"
                      aria-label="Simulated test card number"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-stone-100 border border-stone-300 rounded-xl font-mono text-stone-700 cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      name="cardExp"
                      readOnly
                      value="12/28 (Sandbox)"
                      aria-label="Simulated expiration date"
                      className="w-full px-3.5 py-2.5 text-sm bg-stone-100 border border-stone-300 rounded-xl text-center text-stone-700 cursor-not-allowed select-none"
                    />
                  </div>
                  <div>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-stone-400 absolute right-3.5 top-3.5 pointer-events-none" />
                      <input
                        type="text"
                        name="cardCvc"
                        readOnly
                        value="123"
                        aria-label="Simulated card verification code"
                        className="w-full px-3.5 py-2.5 text-sm bg-stone-100 border border-stone-300 rounded-xl text-center text-stone-700 cursor-not-allowed select-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order summary recap */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Items Total</span>
                  <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-200 text-sm font-bold text-slate-900">
                  <span>Total Due</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setStep('shipping')}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-black flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Shipping
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-md"
                >
                  <Lock className="w-4 h-4" />
                  Simulate Demo Payment (${total.toFixed(2)})
                </button>
              </div>
            </form>
          )}

          {step === 'success' && completedOrder && (
            <div className="text-center py-4 space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                  Order Successfully Placed
                </span>
                <h3 className="text-2xl font-serif font-bold text-slate-900 mt-1">
                  Thank you, {completedOrder.customer.fullName.split(' ')[0]}!
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Confirmation receipt has been sent to <span className="font-semibold text-slate-800">{completedOrder.customer.email}</span>
                </p>
              </div>

              {/* Order Info Card */}
              <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 text-left space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div>
                    <span className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Order ID</span>
                    <p className="text-sm font-mono font-bold text-slate-900">{completedOrder.orderId}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Date</span>
                    <p className="text-xs font-medium text-slate-800">{completedOrder.date}</p>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Shipping Address</span>
                  <p className="text-xs text-slate-800 font-medium mt-0.5">
                    {completedOrder.customer.address}, {completedOrder.customer.city},{' '}
                    {completedOrder.customer.postalCode}, {completedOrder.customer.country}
                  </p>
                </div>

                {/* Items Summary */}
                <div className="pt-2 border-t border-stone-200">
                  <span className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold mb-2 block">
                    Ordered Items ({completedOrder.items.length})
                  </span>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {completedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 truncate max-w-[200px]">
                            {item.product.title}
                          </span>
                          <span className="text-stone-400">
                            ({item.selectedSize} × {item.quantity})
                          </span>
                        </div>
                        <span className="font-bold text-slate-900">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-200 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Total Paid</span>
                  <span className="text-emerald-700">${completedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleResetAndClose}
                className="w-full py-3.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-md"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
