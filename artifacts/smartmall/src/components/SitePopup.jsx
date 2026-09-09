import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';

const SitePopup = () => {
    const [popups, setPopups] = useState([]);
    const [dismissed, setDismissed] = useState(new Set());
    const location = useLocation();

    const fetchPopups = useCallback(async () => {
        try {
            const page = location.pathname;
            const r = await api.get(`/popups/active?page=${encodeURIComponent(page)}`);
            setPopups(r.data || []);
        } catch { /* silent */ }
    }, [location.pathname]);

    useEffect(() => { fetchPopups(); }, [fetchPopups]);

    const dismiss = (id) => {
        setDismissed(prev => new Set([...prev, id]));
    };

    const activePopups = popups.filter(p => !dismissed.has(p.id));

    if (activePopups.length === 0) return null;

    return (
        <AnimatePresence>
            {activePopups.map((popup, i) => {
                const zIndex = 100 + i;
                const autoClose = popup.auto_close_seconds > 0;

                return (
                    <AutoClosePopup key={popup.id} popup={popup} zIndex={zIndex} dismiss={dismiss} autoClose={autoClose} />
                );
            })}
        </AnimatePresence>
    );
};

const AutoClosePopup = ({ popup, zIndex, dismiss, autoClose }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (!autoClose) return;
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(() => dismiss(popup.id), 300);
        }, popup.auto_close_seconds * 1000);
        return () => clearTimeout(timer);
    }, [autoClose, popup.auto_close_seconds, popup.id, dismiss]);

    const imgUrl = popup.image
        ? (popup.image.startsWith('http') ? popup.image : `/storage/${popup.image}`)
        : null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.5 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    style={{ zIndex }}
                    onClick={(e) => { if (e.target === e.currentTarget) dismiss(popup.id); }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative max-w-lg w-full glass-dark rounded-[2rem] border border-white/10 overflow-hidden"
                    >
                        <button onClick={() => dismiss(popup.id)}
                            className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all">
                            <X className="w-5 h-5" />
                        </button>

                        {imgUrl && (
                            <div className="w-full h-48 sm:h-64 bg-gray-800">
                                <img src={imgUrl} alt={popup.title || ''} className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div className="p-6 sm:p-8 text-center">
                            {popup.title && <h3 className="text-xl font-extrabold text-white mb-2">{popup.title}</h3>}
                            {popup.content && <p className="text-gray-400 text-sm leading-relaxed">{popup.content}</p>}
                            {popup.btn_text && popup.btn_url && (
                                <a href={popup.btn_url}
                                    className="inline-block mt-5 px-8 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-l from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/30 transition-all">
                                    {popup.btn_text}
                                </a>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SitePopup;
