/**
 * imageOptimizer - محول صور Cloudinary + lazy helper
 * يحول روابط Cloudinary إلى w_300,h_300,c_fill,f_auto,q_auto لتقليل الحجم 70%
 * ويوفر خصائص img جاهزة للـ lazy loading
 */

export function optimizeCloudinaryUrl(url, { width = 300, height = 300 } = {}) {
  if (!url || typeof url !== 'string') return url;
  // فقط Cloudinary
  if (!url.includes('res.cloudinary.com')) return url;
  // إذا كان الرابط يحتوي بالفعل على تحويلات، لا نكرر
  if (url.includes('/w_') || url.includes(',f_auto')) return url;
  // أدخل التحويل بعد /upload/
  return url.replace(
    '/upload/',
    `/upload/w_${width},h_${height},c_fill,f_auto,q_auto/`
  );
}

export function getOptimizedImageProps(src, opts = {}) {
  const optimized = optimizeCloudinaryUrl(src, opts);
  return {
    src: optimized,
    loading: 'lazy',
    decoding: 'async',
  };
}
