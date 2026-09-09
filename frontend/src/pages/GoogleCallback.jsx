import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import api from '../api/axios';
import { getDashboardPath } from '../utils/role';

const GoogleCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { fetchUser } = useAuthStore();
    const [status, setStatus] = useState('جاري تسجيل الدخول...');

    useEffect(() => {
        const run = async () => {
            const token = searchParams.get('token');
            const error = searchParams.get('error');

            if (error) {
                navigate('/login?error=' + error);
                return;
            }

            if (!token) {
                navigate('/login');
                return;
            }

            localStorage.setItem('token', token);

            try {
                setStatus('جاري تحميل بيانات المستخدم...');
                await fetchUser();

                const user = useAuthStore.getState().user;
                if (!user) {
                    setStatus('فشل تحميل البيانات، جاري إعادة المحاولة...');
                    await new Promise(r => setTimeout(r, 1000));
                    await fetchUser();
                }

                const u = useAuthStore.getState().user;
                if (!u) {
                    localStorage.removeItem('token');
                    navigate('/login?error=login_failed');
                    return;
                }

                navigate(getDashboardPath(u));
            } catch {
                localStorage.removeItem('token');
                navigate('/login?error=login_failed');
            }
        };

        run();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                <p className="text-gray-400 text-sm font-medium">{status}</p>
            </div>
        </div>
    );
};

export default GoogleCallback;
