import api from '../api/axios';

let installed = false;

function sanitize(text) {
    if (!text) return text;
    const keys = ['password', 'token', 'api_key', 'secret', 'credit_card', 'cvv'];
    let out = text;
    keys.forEach(k => {
        out = out.replace(new RegExp(k + '\\s*[:=]\\s*\\S+', 'gi'), k + ': [REDACTED]');
    });
    return out.slice(0, 2000);
}

export function reportError(error, extra = {}) {
    try {
        const message = sanitize(error?.message || String(error) || 'Unknown error');
        const stack = sanitize(error?.stack || extra.componentStack || '');
        const payload = {
            message,
            type: extra.type || error?.name || 'frontend.error',
            severity: extra.severity || 'error',
            source: extra.source || 'frontend',
            url: window.location.href.slice(0, 500),
            route: window.location.pathname.slice(0, 255),
            file: extra.file || error?.fileName || null,
            line: extra.line || error?.lineNumber || null,
            stack_trace: stack.slice(0, 8000),
            method: 'GET',
        };
        // لا نرسل إذا لم يكن المستخدم مسجلاً أو بدون توكن (تجنب spam)
        // لكن نرسل حتى للزائر مع user_id null — backend يسمح
        api.post('/system-errors/report', payload).catch(() => {});
    } catch {}
}

export function installGlobalHandlers() {
    if (installed) return;
    installed = true;

    window.addEventListener('error', (event) => {
        reportError(event.error || new Error(event.message), {
            type: 'js.error',
            file: event.filename,
            line: event.lineno,
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        const err = reason instanceof Error ? reason : new Error(String(reason));
        reportError(err, { type: 'js.unhandledrejection' });
    });

    // التقاط أخطاء الموارد (صور/JS/CSS فشل)
    window.addEventListener('error', (event) => {
        const target = event.target;
        if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
            const src = target.src || target.href || '';
            if (src) {
                reportError(new Error(`Failed to load resource: ${src.slice(0, 200)}`), {
                    type: 'resource.failed',
                    severity: 'warning',
                    file: src,
                });
            }
        }
    }, true);
}
