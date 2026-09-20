import { create } from 'zustand';
import api from '../api/axios';
import { connectEcho, listenForNotifications, disconnectEcho } from '../utils/echo';

const STORAGE_KEY = 'token';

const getToken = () => {
    return localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
};

const setToken = (token, remember) => {
    if (remember) {
        localStorage.setItem(STORAGE_KEY, token);
        sessionStorage.removeItem(STORAGE_KEY);
    } else {
        sessionStorage.setItem(STORAGE_KEY, token);
        localStorage.removeItem(STORAGE_KEY);
    }
};

const removeToken = () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
};

const useAuthStore = create((set, get) => ({
    user: null,
    token: getToken(),
    isAuthenticated: !!getToken(),
    loading: false,

    initEcho: () => {
        const token = getToken();
        const user = get().user;
        if (token && user?.id) {
            connectEcho(token);
            listenForNotifications(user.id);
        }
    },

    login: async (credentials, remember = true) => {
        set({ loading: true });
        try {
            const response = await api.post('/login', credentials);
            const { user, access_token } = response.data;
            setToken(access_token, remember);
            set({ user, token: access_token, isAuthenticated: true, loading: false });
            connectEcho(access_token);
            listenForNotifications(user.id);
            return { success: true, user };
        } catch (error) {
            set({ loading: false });
            return {
                success: false,
                message: error.response?.data?.message || 'خطأ في البريد الإلكتروني أو كلمة المرور. تحقق وحاول مرة أخرى.'
            };
        }
    },

    register: async (userData) => {
        set({ loading: true });
        try {
            const response = await api.post('/register', userData);
            const { user, access_token } = response.data;
            setToken(access_token, true);
            set({ user, token: access_token, isAuthenticated: true, loading: false });
            connectEcho(access_token);
            listenForNotifications(user.id);
            return { success: true };
        } catch (error) {
            set({ loading: false });
            const data = error.response?.data;
            const firstError = data?.errors ? Object.values(data.errors)[0]?.[0] : null;
            return {
                success: false,
                message: firstError || data?.message || 'حدث خطأ أثناء التسجيل. تأكد من البيانات المدخلة.',
                errors: data?.errors || null,
                status: error.response?.status || null,
            };
        }
    },

    logout: async () => {
        disconnectEcho();
        try {
            await api.post('/logout');
        } finally {
            removeToken();
            set({ user: null, token: null, isAuthenticated: false });
        }
    },

    fetchUser: async () => {
        if (!getToken()) return;
        try {
            const response = await api.get('/me');
            set({ user: response.data, isAuthenticated: true });
            const user = response.data;
            if (user?.id) {
                connectEcho(getToken());
                listenForNotifications(user.id);
            }
        } catch (error) {
            removeToken();
            set({ user: null, token: null, isAuthenticated: false });
        }
    }
}));

export default useAuthStore;
