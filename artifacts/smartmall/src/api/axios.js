import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.DEV ? '/smartmall-api-proxy/api/v1' : 'https://samrtmall.cloud/api/v1',
    // baseURL: 'http://127.0.0.1:8000/api/v1',

    timeout: 15000, // 15s for normal requests; FormData uploads use 0 (see interceptor)
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // Let browser set Content-Type for FormData (multipart)
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    // Request ID للمزامنة مع Backend logs
    try {
        const rid = 'SM-' + Math.random().toString(36).slice(2, 10).toUpperCase();
        config.headers['X-Request-Id'] = rid;
    } catch {}
    return config;
});

api.interceptors.response.use(
    (response) => {
        // تمرير Request ID من الرد إن وجد
        return response;
    },
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url || '';
        if (status >= 400) {
            // سجل 4xx كـ warning (مفيد لتعديل المنشأة) و 5xx كـ error
            const is4xx = status < 500;
            // لا نسجل 401 (غير مصرح) كخطأ
            if (status === 401) return Promise.reject(error);
            try {
                import('../utils/errorReporter').then(({ reportError }) => {
                    reportError(error, {
                        type: `api.${status}`,
                        severity: is4xx ? 'warning' : 'error',
                        source: 'network',
                        file: url,
                        line: status,
                    });
                });
            } catch {}
        }
        return Promise.reject(error);
    }
);

export default api;
