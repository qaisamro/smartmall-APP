import React from 'react';

const QtyModal = ({ open, product, qty, setQty, onCancel, onConfirm }) => {
    if (!open || !product) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
            <div className="relative w-full max-w-md mx-4 bg-[#1a1a24] rounded-2xl p-6 shadow-2xl border border-white/8">
                <h3 className="text-lg font-bold mb-3 text-right text-white">اختر الكمية</h3>
                <div className="flex items-center gap-4 mb-4">
                    <div className="product-image-frame w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={product.image || product.link_photo || '/placeholder.webp'} alt={product.name_ar} className="product-image" />
                    </div>
                    <div className="flex-1 text-right">
                        <div className="font-bold text-white">{product.name_ar}</div>
                        <div className="text-sm text-gray-300">{product.price} ₪</div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-3 mb-6">
                    <button onClick={() => setQty(q => Math.max(0.01, (parseFloat(q) || 0.01) - 0.1))} className="w-10 h-10 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">−</button>
                    <input type="number" min="0.01" step="0.1" value={qty} onChange={e => setQty(Math.max(0.01, parseFloat(e.target.value) || 0.01))} className="w-16 bg-transparent text-center text-white font-bold outline-none text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button onClick={() => setQty(q => Math.max(0.01, (parseFloat(q) || 0.01) + 0.1))} className="w-10 h-10 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">+</button>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-white/10 text-white border border-white/8 hover:bg-white/20 transition-colors">إلغاء</button>
                    <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">أضف إلى السلة</button>
                </div>
            </div>
        </div>
    );
};

export default QtyModal;
