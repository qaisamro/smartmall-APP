import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

const CART_EXPIRY_MS = 60 * 60 * 1000;

// حساب إجمالي العرض متعدد الشرائح: أقل سعر ممكن لأي كمية باستخدام DP
export function calcTieredTotal(quantity, tiers, fallbackPrice) {
    const fb = parseFloat(fallbackPrice) || 0;
    if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
        return fb * quantity;
    }
    // فلترة الشرائح الصالحة
    const valid = tiers.filter(t => t.quantity > 0 && parseFloat(t.price) >= 0).sort((a,b)=>a.quantity-b.quantity);
    if (valid.length === 0) return fb * quantity;
    const q = Math.floor(quantity);
    // إذا الكمية عشرية (كيلو) استخدم السعر العادي
    if (q !== quantity) return fb * quantity;
    // DP لأقل سعر
    const dp = new Array(q+1).fill(Infinity);
    dp[0]=0;
    for(let i=1;i<=q;i++){
        // شراء حبة واحدة بسعر fallback (بدون عرض) كخيار
        dp[i] = dp[i-1] + fb;
        for(const t of valid){
            if (t.quantity <= i) {
                const cand = dp[i - t.quantity] + parseFloat(t.price);
                if (cand < dp[i]) dp[i]=cand;
            } else if (i === t.quantity) {
                // شريحة أكبر من المتبقي لكن تساوي الكمية بالضبط
                if (parseFloat(t.price) < dp[i]) dp[i]=parseFloat(t.price);
            }
        }
        // أيضاً جرب شريحة واحدة تغطي الكمية بالكامل حتى لو أكبر (مثال 3 بـ 10 لكمية 2 → يدفع 10)
        // لا نطبقها تلقائياً بل نتركها كخيار لو أراد صاحب المول، لكن حالياً لا نغطي طلب أقل من الشريحة بسعر الشريحة الكاملة إلا إذا كانت أرخص
        for(const t of valid){
            if (t.quantity >= i && parseFloat(t.price) < dp[i]) {
                // إذا شريحة تغطي كل الكمية المطلوبة وسعرها أرخص من الحساب السابق
                // مثال: 3 بـ 10 لكمية 2 → 10 أرخص من 2*4=8؟ لا، لكن 8 أرخص فلا نختار. لذا شرط السعر الأرخص يكفي
                dp[i] = Math.min(dp[i], parseFloat(t.price));
            }
        }
    }
    return dp[q];
}

const useCartStore = create(
    persist(
        (set, get) => {
            // Recompute cached total after any cart mutation (same math as total())
            const recompute = (items) => {
                if (!items || items.length === 0) return 0;
                return items.reduce((acc, item) => {
                    if (item.tiers && Array.isArray(item.tiers) && item.tiers.length > 0) {
                        return acc + calcTieredTotal(item.quantity, item.tiers, item.original_price ?? item.price);
                    }
                    if (item.offer_quantity && item.offer_quantity > 1 && item.offer_bundle_price != null) {
                        const tiers = [{ quantity: item.offer_quantity, price: item.offer_bundle_price }];
                        tiers.push({ quantity: 1, price: item.original_price ?? item.price });
                        return acc + calcTieredTotal(item.quantity, tiers, item.original_price ?? item.price);
                    }
                    const price = parseFloat(item.price) || 0;
                    const qty = parseFloat(item.quantity) || 0;
                    return acc + (price * qty);
                }, 0);
            };

            return {
            items: [],
            mallId: null,
            activeMallId: null,
            cartCreatedAt: null,
            totalValue: 0,

            setActiveMall: (id) => set({ activeMallId: id }),

            addItem: (product, qty = 1) => {
                const state = get();

                if (state.cartCreatedAt && Date.now() - state.cartCreatedAt > CART_EXPIRY_MS) {
                    set({ items: [], mallId: null, cartCreatedAt: null, totalValue: 0 });
                }

                const items = get().items;
                const existingItem = items.find(i => i.id === product.id);

                const now = get().cartCreatedAt || Date.now();

                let nextItems;
                if (existingItem) {
                    nextItems = items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
                } else {
                    nextItems = [...items, { ...product, quantity: qty }];
                }

                set({
                    items: nextItems,
                    mallId: product.mall_id,
                    cartCreatedAt: now,
                    totalValue: recompute(nextItems),
                });

                api.post('/cart/log-add', {
                    product_id: product.id,
                    product_name: product.name_ar || product.name_en,
                    quantity: qty,
                    price: product.price,
                    mall_id: product.mall_id,
                }).catch(() => {});
            },

            removeItem: (productId) => {
                const newItems = get().items.filter(i => i.id !== productId);
                set({
                    items: newItems,
                    totalValue: recompute(newItems),
                    cartCreatedAt: newItems.length === 0 ? null : get().cartCreatedAt,
                });
            },

            clearCart: () => set({ items: [], mallId: null, cartCreatedAt: null, totalValue: 0 }),

            updateQuantity: (productId, newQty) => {
                const nextItems = get().items.map(i => i.id === productId ? { ...i, quantity: newQty } : i);
                set({
                    items: nextItems,
                    totalValue: recompute(nextItems),
                });
            },

            updateItemNotes: (productId, notes) => {
                set({
                    items: get().items.map(i => i.id === productId ? { ...i, notes } : i)
                });
            },

            total: () => get().totalValue,

            // Check if cart is expired
            checkExpiry: () => {
                const state = get();
                if (state.cartCreatedAt && Date.now() - state.cartCreatedAt > CART_EXPIRY_MS) {
                    set({ items: [], mallId: null, cartCreatedAt: null, totalValue: 0 });
                    return true;
                }
                return false;
            },
        }},
        {
            name: 'smartmall-cart',
            partialize: (state) => ({
                items: state.items,
                mallId: state.mallId,
                activeMallId: state.activeMallId,
                cartCreatedAt: state.cartCreatedAt,
            }),
            onRehydrateStorage: () => (state) => {
                if (state?.items?.length) {
                    let total = 0;
                    for (const item of state.items) {
                        if (item.tiers && Array.isArray(item.tiers) && item.tiers.length > 0) {
                            total += calcTieredTotal(item.quantity, item.tiers, item.original_price ?? item.price);
                        } else if (item.offer_quantity && item.offer_quantity > 1 && item.offer_bundle_price != null) {
                            const tiers = [{ quantity: item.offer_quantity, price: item.offer_bundle_price }, { quantity: 1, price: item.original_price ?? item.price }];
                            total += calcTieredTotal(item.quantity, tiers, item.original_price ?? item.price);
                        } else {
                            total += (parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0);
                        }
                    }
                    state.totalValue = total;
                }
            },
        }
    )
);

// Auto-check expiry every 60 seconds
if (typeof window !== 'undefined') {
    setInterval(() => {
        useCartStore.getState().checkExpiry();
    }, 60000);

    // Check immediately on load
    useCartStore.getState().checkExpiry();
}

export default useCartStore;
