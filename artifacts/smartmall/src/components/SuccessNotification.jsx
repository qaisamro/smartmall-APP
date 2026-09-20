import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShoppingCart, Sparkles } from 'lucide-react';

const SuccessNotification = ({ show, productName, quantity = 1, price }) => {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: -100, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -100, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] pointer-events-none"
                >
                    <div className="relative">
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-emerald-500/30 blur-2xl rounded-full" />

                        {/* Main notification */}
                        <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl px-6 py-4 shadow-2xl shadow-emerald-500/40 flex items-center gap-4 min-w-[320px]">
                            {/* Icon with animation */}
                            <div className="relative">
                                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                                    <CheckCircle2 className="w-7 h-7" />
                                </div>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: 'spring' }}
                                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center"
                                >
                                    <Sparkles className="w-3 h-3 text-yellow-800" />
                                </motion.div>
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <p className="font-bold text-lg">تمت الإضافة بنجاح!</p>
                                <p className="text-emerald-100 text-sm mt-0.5">
                                    {productName ? `"${productName}"` : 'المنتج'} {quantity > 1 ? `(${quantity} قطع)` : ''}
                                    {price && ` - ${(price * quantity).toFixed(2)} ₪`}
                                </p>
                            </div>

                            {/* Cart icon */}
                            <div className="relative">
                                <ShoppingCart className="w-8 h-8 text-white/80" />
                                <motion.div
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        rotate: [0, 10, -10, 0]
                                    }}
                                    transition={{
                                        duration: 0.5,
                                        repeat: Infinity,
                                        repeatDelay: 1
                                    }}
                                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white/30"
                                />
                            </div>
                        </div>

                        {/* Decorative elements */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="absolute -left-4 top-1/2 -translate-y-1/2"
                        >
                            <div className="w-2 h-2 rounded-full bg-emerald-300" />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="absolute -right-4 top-1/2 -translate-y-1/2"
                        >
                            <div className="w-2 h-2 rounded-full bg-teal-300" />
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SuccessNotification;
