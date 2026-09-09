import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAndroidBackButton } from './hooks/useAndroidBackButton';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Malls = lazy(() => import('./pages/Malls'));
const Scanner = lazy(() => import('./pages/Scanner'));
const Cart = lazy(() => import('./pages/Cart'));
const AdminDashboard = lazy(() => import('./pages/dashboards/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/dashboards/AdminUsers'));
const AdminMalls = lazy(() => import('./pages/dashboards/AdminMalls'));
const AdminMallThemeSettings = lazy(() => import('./pages/dashboards/AdminMallThemeSettings'));
const AdminAccounting = lazy(() => import('./pages/dashboards/AdminAccounting'));
const AdminSubscriptions = lazy(() => import('./pages/dashboards/AdminSubscriptions'));
const AdminDeliveryZones = lazy(() => import('./pages/dashboards/AdminDeliveryZones'));
const OwnerDashboard = lazy(() => import('./pages/dashboards/OwnerDashboard'));
const OwnerProducts = lazy(() => import('./pages/dashboards/OwnerProducts'));
const OwnerSections = lazy(() => import('./pages/dashboards/OwnerSections'));
const ProductImports = lazy(() => import('./pages/dashboards/ProductImports'));
const OwnerMap = lazy(() => import('./pages/dashboards/OwnerMap'));
const OwnerPOS = lazy(() => import('./pages/dashboards/OwnerPOS'));
const OwnerSettings = lazy(() => import('./pages/dashboards/OwnerSettings'));
const OwnerSubscriptions = lazy(() => import('./pages/dashboards/OwnerSubscriptions'));
const OwnerSales = lazy(() => import('./pages/dashboards/OwnerSales'));
const OwnerScanner = lazy(() => import('./pages/dashboards/OwnerScanner'));
const InvoiceScanner = lazy(() => import('./pages/dashboards/InvoiceScanner'));
const MallProfile = lazy(() => import('./pages/MallProfile'));
const MyPurchases = lazy(() => import('./pages/MyPurchases'));
const Offers = lazy(() => import('./pages/Offers'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const CustomerSettings = lazy(() => import('./pages/CustomerSettings'));
const SubmitComplaint = lazy(() => import('./pages/SubmitComplaint'));
const GoogleCallback = lazy(() => import('./pages/GoogleCallback'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AdminComplaints = lazy(() => import('./pages/dashboards/AdminComplaints'));
const AdminSalesReports = lazy(() => import('./pages/dashboards/AdminSalesReports'));
const AdminActivityLogs = lazy(() => import('./pages/dashboards/AdminActivityLogs'));
const AdminPopups = lazy(() => import('./pages/dashboards/AdminPopups'));
const AdminHomeWidgets = lazy(() => import('./pages/dashboards/AdminHomeWidgets'));
const AdminSendNotification = lazy(() => import('./pages/dashboards/AdminSendNotification'));
const SystemHealth = lazy(() => import('./pages/dashboards/SystemHealth'));
const OwnerDelivery = lazy(() => import('./pages/dashboards/OwnerDelivery'));
const OwnerOffers = lazy(() => import('./pages/dashboards/OwnerOffers'));
const AdminExcelUpload = lazy(() => import('./pages/dashboards/AdminExcelUpload'));
const AdminProducts = lazy(() => import('./pages/dashboards/AdminProducts'));
const AdminBulkPhotoUpload = lazy(() => import('./pages/dashboards/AdminBulkPhotoUpload'));
const OwnerExcelUpload = lazy(() => import('./pages/dashboards/OwnerExcelUpload'));
const DeliveryDashboard = lazy(() => import('./pages/dashboards/DeliveryDashboard'));
const TrackerDashboard = lazy(() => import('./pages/dashboards/TrackerDashboard'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000, // 60s - يقلل الطلبات المكررة عند التنقل
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

function AndroidBackButtonHandler() {
    useAndroidBackButton();
    return null;
}

function App() {
    useEffect(() => {
        // Prevent copying/saving product image URLs
        const prevent = (e) => {
            if (e.target && e.target.tagName === 'IMG') e.preventDefault();
        };
        document.addEventListener('contextmenu', prevent, true);
        document.addEventListener('dragstart', prevent, true);
        document.addEventListener('selectstart', prevent, true);
        return () => {
            document.removeEventListener('contextmenu', prevent, true);
            document.removeEventListener('dragstart', prevent, true);
            document.removeEventListener('selectstart', prevent, true);
        };
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <ScrollToTop />
                <AndroidBackButtonHandler />
                <Layout>
                    <Suspense fallback={
                        <div className="min-h-[60vh] flex items-center justify-center">
                            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    }>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/malls" element={<Malls />} />
                            <Route path="/mall/:slug" element={<MallProfile />} />
                            <Route path="/scanner" element={<Scanner />} />
                            <Route path="/cart" element={<Cart />} />
                            <Route path="/my-purchases" element={<MyPurchases />} />
                            <Route path="/offers" element={<Offers />} />
                            <Route path="/order-tracking" element={<OrderTracking />} />
                            <Route path="/customer/settings" element={<CustomerSettings />} />
                            <Route path="/complaints" element={<SubmitComplaint />} />
                            <Route path="/auth/google/callback" element={<GoogleCallback />} />
                            <Route path="/notifications" element={<NotificationsPage />} />
                            <Route path="/orders/:id" element={<OrderDetail />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route path="/admin/users" element={<AdminUsers />} />
                            <Route path="/admin/malls" element={<AdminMalls />} />
                            <Route path="/admin/malls/:id/theme" element={<AdminMallThemeSettings />} />
                            <Route path="/admin/product-imports" element={<ProductImports />} />
                            <Route path="/admin/excel-upload" element={<AdminExcelUpload />} />
                            <Route path="/admin/products" element={<AdminProducts />} />
                            <Route path="/admin/bulk-photo-upload" element={<AdminBulkPhotoUpload />} />
                            <Route path="/admin/accounting" element={<AdminAccounting />} />
                            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                            <Route path="/admin/delivery-zones" element={<AdminDeliveryZones />} />
                            <Route path="/admin/complaints" element={<AdminComplaints />} />
                            <Route path="/admin/sales-reports" element={<AdminSalesReports />} />
                            <Route path="/admin/activity-logs" element={<AdminActivityLogs />} />
                            <Route path="/admin/popups" element={<AdminPopups />} />
                            <Route path="/admin/home-widgets" element={<AdminHomeWidgets />} />
                            <Route path="/admin/notifications" element={<AdminSendNotification />} />
                            <Route path="/admin/system-health" element={<SystemHealth />} />
                            <Route path="/owner" element={<OwnerDashboard />} />
                            <Route path="/owner/products" element={<OwnerProducts />} />
                            <Route path="/owner/sections" element={<OwnerSections />} />
                            <Route path="/owner/product-imports" element={<ProductImports />} />
                            <Route path="/owner/branches" element={<OwnerMap />} />
                            <Route path="/owner/subscriptions" element={<OwnerSubscriptions />} />
                            <Route path="/owner/settings" element={<OwnerSettings />} />
                            <Route path="/owner/pos" element={<OwnerPOS />} />
                            <Route path="/owner/sales" element={<OwnerSales />} />
                            <Route path="/owner/scanner" element={<OwnerScanner />} />
                            <Route path="/owner/invoice-scanner" element={<InvoiceScanner />} />
                            <Route path="/owner/delivery" element={<OwnerDelivery />} />
                            <Route path="/owner/offers" element={<OwnerOffers />} />
                            <Route path="/owner/excel-upload" element={<OwnerExcelUpload />} />
                            <Route path="/delivery" element={<DeliveryDashboard />} />
                            <Route path="/tracker" element={<TrackerDashboard />} />
                        </Routes>
                    </Suspense>
                </Layout>
            </Router>
        </QueryClientProvider>
    );
}

export default App;
