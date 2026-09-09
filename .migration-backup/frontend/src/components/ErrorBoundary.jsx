import React from 'react';
import { reportError } from '../utils/errorReporter';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        reportError(error, { source: 'react', componentStack: info?.componentStack });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-lg font-bold text-white mb-2">حدث خطأ غير متوقع</h2>
                    <p className="text-sm text-gray-400 mb-6 max-w-md">
                        {this.state.error?.message ? this.state.error.message.slice(0, 200) : 'عذراً، حدث خلل في تحميل هذه الصفحة.'}
                    </p>
                    <div className="flex gap-3">
                        <button onClick={this.handleRetry} className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition">
                            إعادة المحاولة
                        </button>
                        <button onClick={() => window.location.href = '/'} className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition">
                            العودة للرئيسية
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
