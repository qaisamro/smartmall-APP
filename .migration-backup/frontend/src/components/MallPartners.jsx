import React from 'react';
import { motion } from 'framer-motion';
import { Handshake } from 'lucide-react';

const partners = [
    { img: '/partners/partner-1.jpg' },
    { img: '/partners/partner-2.png' },
    { img: '/partners/partner-3.jpg' },
    { img: '/partners/partner-4.jpg' },
    { img: '/partners/partner-5.jpg' },
    { img: '/partners/partner-6.jpg' },
];

const MallPartners = () => {
    return (
        <section className="relative overflow-hidden py-16 px-4">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="max-w-7xl mx-auto relative">
                <div className="text-center space-y-3 mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-bold">
                        <Handshake className="w-4 h-4" />
                        شركاؤنا
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold">
                        شراكة{' '}
                        <span className="bg-gradient-to-l from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            مميزة
                        </span>{' '}
                        مع
                    </h2>
                    <p className="text-gray-400 text-lg">نعمل مع أفضل المولات والسوبر ماركت لتقديم أفضل تجربة تسوق</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
                    {partners.map((p, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="glass-card rounded-3xl p-4 sm:p-6 flex items-center justify-center aspect-square group"
                        >
                            <img
                                src={p.img}
                                alt={`شريك SmartMall ${idx + 1}`}
                                loading="lazy"
                                className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-110"
                                draggable={false}
                            />
                        </motion.div>
                    ))}
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="text-center text-sm text-gray-500 mt-10"
                >
                    وانضم إلى عائلة SmartMall —{' '}
                    <span className="text-gray-400 font-semibold">انضم كمول أو سوبر ماركت</span> {' '}
                    واستفد من شبكة عملائنا المتزايدة
                </motion.p>
            </div>
        </section>
    );
};

export default MallPartners;