export const defaultTheme = {
    primary_color: '#4f46e5',
    secondary_color: '#1a1a24',
    accent_color: '#10b981',
    background_color: '#0a0a0f',
    text_color: '#ffffff',
    dark_mode: true,
    font_family: 'Cairo',
    border_radius: 'modern',
};

export const radiusByStyle = {
    sharp: '8px',
    modern: '20px',
    rounded: '32px',
};

export const predefinedThemes = {
    'smart-blue': {
        name: 'Smart Blue',
        ...defaultTheme,
    },
    'luxury-gold': {
        name: 'Luxury Gold',
        primary_color: '#d97706',
        secondary_color: '#1a1a24',
        accent_color: '#facc15',
        background_color: '#0a0a0f',
        text_color: '#fff7ed',
        dark_mode: true,
        font_family: 'Cairo',
        border_radius: 'modern',
    },
    'fresh-market': {
        name: 'Fresh Market',
        primary_color: '#16a34a',
        secondary_color: '#ecfdf5',
        accent_color: '#f97316',
        background_color: '#f8fafc',
        text_color: '#10231a',
        dark_mode: false,
        font_family: 'Inter',
        border_radius: 'rounded',
    },
    'mono-sharp': {
        name: 'Mono Sharp',
        primary_color: '#111827',
        secondary_color: '#f3f4f6',
        accent_color: '#ef4444',
        background_color: '#ffffff',
        text_color: '#111827',
        dark_mode: false,
        font_family: 'Inter',
        border_radius: 'sharp',
    },
    'modern-purple': {
        name: 'Modern Purple',
        primary_color: '#8b5cf6',
        secondary_color: '#1a1a24',
        accent_color: '#06b6d4',
        background_color: '#0a0a0f',
        text_color: '#ffffff',
        dark_mode: true,
        font_family: 'Cairo',
        border_radius: 'modern',
    },
    'emerald-glow': {
        name: 'Emerald Glow',
        primary_color: '#10b981',
        secondary_color: '#1a1a24',
        accent_color: '#3b82f6',
        background_color: '#0a0a0f',
        text_color: '#ffffff',
        dark_mode: true,
        font_family: 'Cairo',
        border_radius: 'modern',
    },
};

export const normalizeTheme = (theme = {}) => ({
    ...defaultTheme,
    ...Object.fromEntries(Object.entries(theme || {}).filter(([, value]) => value !== null && value !== undefined)),
});

export const themeToCssVars = (theme = {}) => {
    const normalized = normalizeTheme(theme);
    return {
        '--primary-color': normalized.primary_color,
        '--secondary-color': normalized.secondary_color,
        '--accent-color': normalized.accent_color,
        '--background-color': normalized.background_color,
        '--text-color': normalized.text_color,
        '--theme-radius': radiusByStyle[normalized.border_radius] || radiusByStyle.modern,
        '--theme-font': normalized.font_family || defaultTheme.font_family,
        backgroundColor: normalized.background_color,
        color: normalized.text_color,
        fontFamily: `var(--theme-font), system-ui, sans-serif`,
    };
};
