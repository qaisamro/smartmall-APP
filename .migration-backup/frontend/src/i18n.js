import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            ar: {
                translation: {
                    "welcome": "أهلاً بك في منصة المول الذكي",
                    "login": "تسجيل الدخول",
                    "register": "إنشاء حساب",
                    "malls": "المولات",
                    "products": "المنتجات",
                    "cart": "السلة",
                    "scanning": "مسح الرمز",
                    "currency": "شيكل"
                }
            },
            en: {
                translation: {
                    "welcome": "Welcome to Smart Mall Platform",
                    "login": "Login",
                    "register": "Register",
                    "malls": "Malls",
                    "products": "Products",
                    "cart": "Cart",
                    "scanning": "Scanning",
                    "currency": "ILS"
                }
            }
        },
        fallbackLng: "ar",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
