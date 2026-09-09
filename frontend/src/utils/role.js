export const getRole = (user) => {
    if (!user) return null;
    if (Array.isArray(user.roles)) {
        if (typeof user.roles[0] === 'string') return user.roles[0];
        if (user.roles[0]?.name) return user.roles[0].name;
    }
    return user.role || null;
};

export const getDashboardPath = (user) => {
    const role = getRole(user);
    switch (role) {
        case 'super-admin':
        case 'admin':
            return '/admin';
        case 'mall-owner':
        case 'supermarket-owner':
            return '/owner';
        case 'delivery-person':
            return '/delivery';
        case 'order-tracker':
            return '/tracker';
        default:
            return '/';
    }
};