import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Download, Share, Plus, Apple, CheckCircle2 } from 'lucide-react';

const PwaInstructions = () => {
    return (
        <section className="py-16 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center space-y-4 mb-12">
                    <h2 className="text-3xl sm:text-4xl font-extrabold">حمّل التطبيق الآن</h2>
                    <p className="text-gray-400 text-lg">احصل على تجربة أسرع وإشعارات فورية على شاشتك الرئيسية</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Android Instructions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="glass-card rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden border border-emerald-500/20"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                <Smartphone className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">لأجهزة Android</h3>
                                <p className="text-emerald-400 text-sm mt-1">سريع وسهل جداً</p>
                            </div>
                        </div>

                        <div className="space-y-6 relative">
                            {[
                                {
                                    icon: <Download className="w-5 h-5 text-emerald-400" />,
                                    text: "اضغط على زر «تثبيت التطبيق» الذي يظهر أسفل الشاشة.",
                                },
                                {
                                    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
                                    text: "وافق على التثبيت، وستجد أيقونة SmartMall على شاشتك الرئيسية.",
                                },
                                {
                                    icon: <Bell className="w-5 h-5 text-emerald-400" />,
                                    text: "افتح التطبيق ووافق على تفعيل الإشعارات لتصلك فوراً.",
                                }
                            ].map((step, idx) => (
                                <div key={idx} className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-1">
                                        {step.icon}
                                    </div>
                                    <p className="text-gray-300 leading-relaxed font-medium pt-2">{step.text}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* iPhone Instructions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, delay: 0.1 }}
                        className="glass-card rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden border border-blue-500/20"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                <Apple className="w-8 h-8 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">لأجهزة iPhone</h3>
                                <p className="text-blue-400 text-sm mt-1">متصفح Safari</p>
                            </div>
                        </div>

                        <div className="space-y-6 relative">
                            {[
                                {
                                    icon: <Share className="w-5 h-5 text-blue-400" />,
                                    text: "في متصفح Safari، اضغط على أيقونة «المشاركة» في شريط الأدوات السفلي.",
                                },
                                {
                                    icon: <Plus className="w-5 h-5 text-blue-400" />,
                                    text: "اسحب القائمة للأعلى واختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen).",
                                },
                                {
                                    icon: <Smartphone className="w-5 h-5 text-blue-400" />,
                                    text: "اضغط على «إضافة»، ثم افتح التطبيق من الأيقونة الجديدة للموافقة على الإشعارات.",
                                }
                            ].map((step, idx) => (
                                <div key={idx} className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-1">
                                        {step.icon}
                                    </div>
                                    <p className="text-gray-300 leading-relaxed font-medium pt-2">{step.text}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

// Re-exporting Bell since it's used inside the array but wasn't imported.
import { Bell } from 'lucide-react';

export default PwaInstructions;
