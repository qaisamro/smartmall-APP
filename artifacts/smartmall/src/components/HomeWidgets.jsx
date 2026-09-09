import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../api/axios';
import {
    Sun, DollarSign, Coins, Clock, Pill, Newspaper,
    AlertTriangle, Map, Thermometer, Droplets, Wind, TrendingUp, TrendingDown,
    AlertCircle, Info, AlertOctagon, CheckCircle, RefreshCw,
    Phone, MapPin
} from 'lucide-react';

const sectionAccents = {
    weather: { from: 'from-sky-500', to: 'to-cyan-600', glow: 'shadow-sky-500/20', iconColor: 'text-sky-400', bgGlow: 'bg-sky-500/5' },
    currencies: { from: 'from-emerald-500', to: 'to-green-600', glow: 'shadow-emerald-500/20', iconColor: 'text-emerald-400', bgGlow: 'bg-emerald-500/5' },
    gold: { from: 'from-amber-500', to: 'to-yellow-600', glow: 'shadow-amber-500/20', iconColor: 'text-amber-400', bgGlow: 'bg-amber-500/5' },
    prayer_times: { from: 'from-purple-500', to: 'to-indigo-600', glow: 'shadow-purple-500/20', iconColor: 'text-purple-400', bgGlow: 'bg-purple-500/5' },
    pharmacies: { from: 'from-rose-500', to: 'to-pink-600', glow: 'shadow-rose-500/20', iconColor: 'text-rose-400', bgGlow: 'bg-rose-500/5' },
    news: { from: 'from-slate-500', to: 'to-gray-600', glow: 'shadow-slate-500/20', iconColor: 'text-slate-400', bgGlow: 'bg-slate-500/5' },
    alerts: { from: 'from-red-500', to: 'to-orange-600', glow: 'shadow-red-500/20', iconColor: 'text-red-400', bgGlow: 'bg-red-500/5' },
    road_conditions: { from: 'from-teal-500', to: 'to-cyan-600', glow: 'shadow-teal-500/20', iconColor: 'text-teal-400', bgGlow: 'bg-teal-500/5' },
};

const typeIcons = { info: Info, warning: AlertTriangle, danger: AlertOctagon, success: CheckCircle };
const typeColors = { info: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' }, warning: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }, danger: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' }, success: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' } };
const roadStatuses = { clear: { label: 'مفتوح', color: 'text-emerald-400', dot: 'bg-emerald-400' }, moderate: { label: 'مزدحم', color: 'text-amber-400', dot: 'bg-amber-400' }, heavy: { label: 'مغلق', color: 'text-red-400', dot: 'bg-red-400' }, closed: { label: 'مغلق', color: 'text-gray-400', dot: 'bg-gray-400' } };

const WidgetCard = ({ sectionKey, children, className = '' }) => {
    const accent = sectionAccents[sectionKey] || sectionAccents.news;
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:shadow-xl ${accent.glow} hover:-translate-y-0.5 ${className}`}
        >
            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-l ${accent.from} ${accent.to} opacity-80`} />
            <div className={`absolute -top-24 -right-24 w-48 h-48 ${accent.bgGlow} rounded-full blur-3xl transition-opacity duration-500 opacity-0 group-hover:opacity-100`} />
            <div className="relative p-4">
                {children}
            </div>
        </motion.div>
    );
};

const SectionHeader = ({ label, icon: Icon, accent }) => (
    <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${accent.iconColor}`} />
        {label}
    </h3>
);

const HomeWidgets = () => {
    const { data, isLoading, isRefetching } = useQuery({
        queryKey: ['home-widgets'],
        queryFn: async () => (await api.get('/home-widgets')).data,
        refetchInterval: 300000,
    });

    if (isLoading || !data) return null;

    const { sections = [], data: sectionData = {} } = data;
    if (sections.length === 0) return null;

    const sectionMap = {};
    sections.forEach(s => { sectionMap[s.key] = s; });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-6 rounded-full bg-gradient-to-b from-indigo-400 to-purple-500" />
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white">معلومات حية</h2>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${isRefetching ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                    {isRefetching ? 'تحديث...' : 'مباشر'}
                    <RefreshCw className={`w-3 h-3 ${isRefetching ? 'animate-spin' : ''}`} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {/* Weather */}
                {sectionData.weather && sectionMap.weather && (
                    <WidgetCard sectionKey="weather">
                        <SectionHeader label={sectionMap.weather.label_ar} icon={Sun} accent={sectionAccents.weather} />
                        <div className="flex items-start justify-between">
                            <div className="text-4xl font-black text-white tracking-tight">{sectionData.weather.temperature}°</div>
                            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                                <Sun className="w-6 h-6 text-amber-400" />
                            </div>
                        </div>
                        <div className="text-sm font-medium text-gray-400 mt-0.5">{sectionData.weather.condition}</div>
                        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/5">
                            {sectionData.weather.humidity != null && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Droplets className="w-3 h-3 text-sky-400" />
                                    <span>{sectionData.weather.humidity}%</span>
                                </div>
                            )}
                            {sectionData.weather.wind_speed != null && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Wind className="w-3 h-3 text-cyan-400" />
                                    <span>{sectionData.weather.wind_speed} كم/س</span>
                                </div>
                            )}
                        </div>
                        {sectionData.weather.forecast_short && (
                            <div className="mt-2 pt-2 border-t border-white/5">
                                <div className="text-xs text-gray-500 leading-relaxed line-clamp-2">{sectionData.weather.forecast_short}</div>
                            </div>
                        )}
                    </WidgetCard>
                )}

                {/* Currencies */}
                {sectionData.currencies?.length > 0 && sectionMap.currencies && (
                    <WidgetCard sectionKey="currencies">
                        <SectionHeader label={sectionMap.currencies.label_ar} icon={DollarSign} accent={sectionAccents.currencies} />
                        <div className="space-y-2">
                            <div className="flex items-center text-[11px] text-gray-600 font-bold pb-1 border-b border-white/5">
                                <span className="flex-1">العملة</span>
                                <span className="w-[4.5rem] text-right">شراء</span>
                                <span className="w-[4.5rem] text-right">بيع</span>
                            </div>
                            {sectionData.currencies.map(c => (
                                <div key={c.id} className="flex items-center text-sm py-1.5 border-b border-white/[0.02] last:border-0">
                                    <span className="flex-1 font-bold text-white">{c.code}</span>
                                    <span className="w-[4.5rem] text-right font-mono text-gray-400">{Number(c.buy_rate).toLocaleString()}</span>
                                    <span className="w-[4.5rem] text-right font-mono text-gray-400">{Number(c.sell_rate).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </WidgetCard>
                )}

                {/* Gold */}
                {sectionData.gold?.length > 0 && sectionMap.gold && (
                    <WidgetCard sectionKey="gold">
                        <SectionHeader label={sectionMap.gold.label_ar} icon={Coins} accent={sectionAccents.gold} />
                        <div className="space-y-2">
                            {sectionData.gold.map(g => (
                                <div key={g.id} className="flex items-center justify-between py-2 border-b border-white/[0.02] last:border-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-400" style={{ boxShadow: '0 0 6px rgba(251,191,36,0.4)' }} />
                                        <span className="text-sm text-gray-400">{g.type}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-white font-mono">{Number(g.price).toLocaleString()}</span>
                                        {g.change != null && (
                                            <span className={`flex items-center gap-0.5 text-xs font-bold ${g.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {g.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                {g.change >= 0 ? '+' : ''}{g.change}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </WidgetCard>
                )}

                {/* Prayer Times */}
                {sectionData.prayer_times && sectionMap.prayer_times && (
                    <WidgetCard sectionKey="prayer_times">
                        <SectionHeader label={sectionMap.prayer_times.label_ar} icon={Clock} accent={sectionAccents.prayer_times} />
                        <div className="grid grid-cols-2 gap-1.5">
                            {[
                                ['الفجر', sectionData.prayer_times.fajr],
                                ['الظهر', sectionData.prayer_times.dhuhr],
                                ['العصر', sectionData.prayer_times.asr],
                                ['المغرب', sectionData.prayer_times.maghrib],
                                ['العشاء', sectionData.prayer_times.isha],
                            ].map(([label, time]) => (
                                <div key={label} className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                                    <span className="text-xs text-gray-500 font-medium">{label}</span>
                                    <span className="text-xs font-bold text-white font-mono">{time}</span>
                                </div>
                            ))}
                        </div>
                    </WidgetCard>
                )}

                {/* Pharmacies */}
                {sectionData.pharmacies?.length > 0 && sectionMap.pharmacies && (
                    <WidgetCard sectionKey="pharmacies">
                        <SectionHeader label={sectionMap.pharmacies.label_ar} icon={Pill} accent={sectionAccents.pharmacies} />
                        <div className="space-y-2">
                            {sectionData.pharmacies.map(p => (
                                <div key={p.id} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm text-white">{p.name}</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">مناوبة</span>
                                    </div>
                                    {p.address && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <MapPin className="w-3 h-3 text-rose-400" />
                                            {p.address}
                                        </div>
                                    )}
                                    {p.phone && (
                                        <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium hover:underline" dir="ltr">
                                            <Phone className="w-3 h-3" />
                                            {p.phone}
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </WidgetCard>
                )}

                {/* News */}
                {sectionData.news?.length > 0 && sectionMap.news && (
                    <WidgetCard sectionKey="news">
                        <SectionHeader label={sectionMap.news.label_ar} icon={Newspaper} accent={sectionAccents.news} />
                        <div className="space-y-2">
                            {sectionData.news.slice(0, 5).map((n, i) => (
                                <div key={n.id} className={`pb-2 ${i < 4 ? 'border-b border-white/[0.04]' : ''}`}>
                                    <div className="text-sm font-bold text-white leading-snug line-clamp-2">{n.title}</div>
                                    {n.summary && <div className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{n.summary}</div>}
                                    {n.source && <div className="text-[10px] text-gray-600 mt-1">{n.source}</div>}
                                </div>
                            ))}
                        </div>
                    </WidgetCard>
                )}

                {/* Alerts */}
                {sectionData.alerts?.length > 0 && sectionMap.alerts && (
                    <WidgetCard sectionKey="alerts">
                        <SectionHeader label={sectionMap.alerts.label_ar} icon={AlertTriangle} accent={sectionAccents.alerts} />
                        <div className="space-y-2">
                            {sectionData.alerts.map(a => {
                                const TypeIcon = typeIcons[a.type] || AlertCircle;
                                const tc = typeColors[a.type] || { text: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
                                return (
                                    <div key={a.id} className={`p-3 rounded-xl ${tc.bg} border ${tc.border} transition-colors`}>
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-7 h-7 rounded-lg ${tc.bg} flex items-center justify-center shrink-0`}>
                                                <TypeIcon className={`w-4 h-4 ${tc.text}`} />
                                            </div>
                                            <div>
                                                <div className={`text-sm font-bold ${tc.text}`}>{a.title}</div>
                                                {a.body && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.body}</div>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </WidgetCard>
                )}

                {/* Road Conditions */}
                {sectionData.road_conditions?.length > 0 && sectionMap.road_conditions && (
                    <WidgetCard sectionKey="road_conditions">
                        <SectionHeader label={sectionMap.road_conditions.label_ar} icon={Map} accent={sectionAccents.road_conditions} />
                        <div className="space-y-2">
                            {sectionData.road_conditions.map(r => {
                                const rs = roadStatuses[r.status] || { label: r.status, color: 'text-gray-400', dot: 'bg-gray-400' };
                                return (
                                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/[0.02] last:border-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${rs.dot}`} />
                                            <span className="text-sm text-gray-400">{r.road_name}</span>
                                        </div>
                                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${rs.color} bg-white/[0.04] border border-white/[0.06]`}>
                                            {rs.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </WidgetCard>
                )}
            </div>
        </div>
    );
};

export default HomeWidgets;
