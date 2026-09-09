import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../api/axios';
import {
  ArrowLeft, ShoppingBag, Package, CreditCard, MapPin,
  Clock, Store, Truck, User, Phone, Mail, MessageCircle, Hash,
  CircleDot, CircleCheck, XCircle, MapPinned
} from 'lucide-react';

const statusSteps = {
  pending: { label: 'قيد الانتظار', icon: CircleDot, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  preparing: { label: 'قيد التجهيز', icon: Clock, color: 'text-sky-400', bg: 'bg-sky-500/10' },
  ready: { label: 'جاهز للاستلام', icon: CircleCheck, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  accepted: { label: 'تم القبول', icon: CircleCheck, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  delivering: { label: 'في الطريق', icon: Truck, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  delivered: { label: 'تم التوصيل', icon: CircleCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  failed: { label: 'تم الغاء الطلب', icon: XCircle, color: 'text-slate-300', bg: 'bg-slate-500/10' },
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: async () => {
      const r = await api.get(`/orders/${id}`);
      return r.data;
    },
    refetchInterval: 20000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-500 font-medium">{error ? 'لا يمكن عرض الطلب' : 'الطلب غير موجود'}</p>
          <button onClick={() => navigate(-1)} className="text-indigo-400 text-sm font-bold hover:underline">
            العودة
          </button>
        </div>
      </div>
    );
  }

  const step = (() => {
    const s = { ...statusSteps[order.delivery_status] || { ...statusSteps.pending } };
    if (order.delivery_method === 'pickup') {
      if (order.delivery_status === 'delivered') { s.label = 'تم الاستلام'; }
      if (order.delivery_status === 'pending') { s.label = 'بانتظار قبول المتجر'; }
    }
    return s;
  })();
  const StepIcon = step.icon;
  const isCancelled = order.delivery_status === 'failed';

  const Container = ({ children, className = '' }) => (
    <div className={`glass-card rounded-[1.75rem] border border-white/[0.06] p-6 ${className}`}>
      {children}
    </div>
  );

  const SectionTitle = ({ icon: Icon, label }) => (
    <h2 className="font-bold text-gray-300 text-sm mb-4 flex items-center gap-2">
      <Icon className="w-4 h-4 text-indigo-400" />
      {label}
    </h2>
  );

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-2 font-medium text-sm">
          <ArrowLeft className="w-4 h-4" />
          عودة
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          {/* Header */}
          <Container>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-white">طلب #{order.id}</h1>
                  <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('ar-EG')}</p>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${step.bg} ${step.color} border border-white/5`}>
                <div className="flex items-center gap-1.5">
                  <StepIcon className="w-3.5 h-3.5" />
                  {step.label}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t border-white/5">
              <div>
                <span className="text-gray-500 text-xs">الإجمالي</span>
                <p className="font-bold text-white text-lg">{order.total_amount} ₪</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">طريقة الاستلام</span>
                <p className="font-medium text-gray-300">{order.delivery_method === 'delivery' ? 'توصيل منزلي' : order.delivery_method === 'pickup' ? 'استلام شخصي من المتجر' : 'داخل المول'}</p>
              </div>
              {(order.delivery_phone || order.user?.phone) && (
                <div>
                  <span className="text-gray-500 text-xs">هاتف الزبون</span>
                  <a href={`tel:${order.delivery_phone || order.user.phone}`} className="font-bold text-emerald-400 hover:underline block" dir="ltr">{order.delivery_phone || order.user.phone}</a>
                </div>
              )}
            </div>
          </Container>

          {/* Mall & Customer */}
          <Container>
            <SectionTitle icon={Store} label="المول والعميل" />
            <div className="space-y-3 text-sm">
              {order.mall && (
                <div className="flex items-center gap-3 text-gray-400">
                  <Store className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="font-medium text-gray-300">{order.mall.name_ar || order.mall.name_en}</span>
                </div>
              )}
              {order.user && (
                <>
                  <div className="flex items-center gap-3 text-gray-400">
                    <User className="w-4 h-4 text-gray-500 shrink-0" />
                    <span>{order.user.name}</span>
                  </div>
                  {order.user.phone && (
                    <div className="flex items-center gap-3 text-gray-400">
                      <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                      <a href={`tel:${order.user.phone}`} className="text-right hover:text-indigo-400 hover:underline" dir="ltr">{order.user.phone}</a>
                    </div>
                  )}
                </>
              )}
            </div>
          </Container>

          {/* Delivery Details */}
          {order.delivery_method === 'delivery' && (
            <Container>
              <SectionTitle icon={Truck} label="تفاصيل التوصيل" />
              <div className="space-y-3 text-sm">
                {order.delivery_address && (
                  <div className="flex items-start gap-3 text-gray-400">
                    <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                    <span>{order.delivery_address}</span>
                  </div>
                )}
                {order.deliveryZone && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <MapPinned className="w-4 h-4 text-gray-500 shrink-0" />
                    <span>{order.deliveryZone.name} {order.delivery_fee > 0 && `(${order.delivery_fee} ₪)`}</span>
                  </div>
                )}
                {order.delivery_person && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-2">
                    <p className="text-xs font-bold text-gray-500 mb-1">بيانات المندوب</p>
                    <div className="flex items-center gap-3 text-gray-300">
                      <User className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="font-bold">{order.delivery_person.name}</span>
                    </div>
                    {order.delivery_person.phone ? (
                      <div className="flex items-center gap-3 text-gray-400">
                        <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                        <a href={`tel:${order.delivery_person.phone}`} className="text-right hover:text-indigo-400 hover:underline" dir="ltr">{order.delivery_person.phone}</a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-gray-600">
                        <Phone className="w-4 h-4 shrink-0" />
                        <span>لا يوجد رقم هاتف</span>
                      </div>
                    )}
                    {order.delivery_person.email && (
                      <div className="flex items-center gap-3 text-gray-400">
                        <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                        <span  className="text-[11px]">{order.delivery_person.email}</span>
                      </div>
                    )}
                    {order.delivery_person.whatsapp && (
                      <div className="flex items-center gap-3 text-gray-400">
                        <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        <a href={`tel:${order.delivery_person.whatsapp}`} className="hover:text-emerald-400 hover:underline" dir="ltr">{order.delivery_person.whatsapp}</a>
                      </div>
                    )}
                  </div>
                )}
                {order.delivery_accepted_at && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                    <span>تم القبول: {new Date(order.delivery_accepted_at).toLocaleString('ar-EG')}</span>
                  </div>
                )}
                {order.delivered_at && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <CircleCheck className="w-4 h-4 text-gray-500 shrink-0" />
                    <span>تم التوصيل: {new Date(order.delivered_at).toLocaleString('ar-EG')}</span>
                  </div>
                )}
              </div>
            </Container>
          )}

          {/* Status Timeline */}
          {order.delivery_method === 'delivery' && order.delivery_status !== 'none' && !isCancelled && (
            <Container>
              <SectionTitle icon={CircleDot} label="حالة التوصيل" />
              <div className="space-y-0 pr-1">
                {['pending', 'accepted', 'delivering', 'delivered'].map((s, i) => {
                  const st = statusSteps[s];
                  const statusOrder = ['pending', 'accepted', 'delivering', 'delivered'];
                  const currentIdx = statusOrder.indexOf(order.delivery_status);
                  const done = i <= currentIdx;
                  const Icon = st.icon;
                  return (
                    <div key={s} className="flex items-start gap-3 relative">
                      {i < 3 && <div className={`absolute right-[15px] top-8 w-0.5 h-8 ${done ? 'bg-indigo-500/40' : 'bg-white/5'}`} />}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-indigo-500/15' : 'bg-white/5'}`}>
                        <Icon className={`w-4 h-4 ${done ? 'text-indigo-400' : 'text-gray-500'}`} />
                      </div>
                      <div className="py-1.5">
                        <p className={`text-sm font-medium ${done ? 'text-white' : 'text-gray-500'}`}>{st.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Container>
          )}

          {/* Products */}
          <Container>
            <SectionTitle icon={Package} label={`المنتجات (${order.items?.length || 0})`} />
            <div className="space-y-2">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.03] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-200">{item.product?.name_ar || 'منتج'}</p>
                      <p className="text-xs text-gray-500">الكمية: {item.quantity}</p>
                      {item.notes && <p className="text-[10px] text-amber-400/70 mt-0.5">{item.notes}</p>}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-200">{item.price_at_sale} ₪</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span>المجموع الفرعي</span>
                <span>{order.total_amount - (order.tax_amount || 0) - (order.delivery_fee || 0)} ₪</span>
              </div>
              {order.tax_amount > 0 && (
                <div className="flex items-center justify-between text-gray-500">
                  <span>الضريبة</span>
                  <span>{order.tax_amount} ₪</span>
                </div>
              )}
              {order.delivery_fee > 0 && (
                <div className="flex items-center justify-between text-gray-500">
                  <span>رسوم التوصيل</span>
                  <span>{order.delivery_fee} ₪</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex items-center justify-between text-emerald-400">
                  <span>الخصم</span>
                  <span>-{order.discount_amount} ₪</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="font-bold text-gray-300">الإجمالي</span>
                <span className="text-lg font-black text-indigo-400">{order.total_amount} ₪</span>
              </div>
            </div>
          </Container>

        </motion.div>
      </div>
    </div>
  );
};

export default OrderDetail;
