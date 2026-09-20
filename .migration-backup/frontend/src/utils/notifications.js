/**
 * Returns the correct navigation URL for a given notification data object.
 * Checks action_url first, then falls back to type-based routing.
 *
 * @param {object} data - The parsed notification data payload
 * @returns {string} - The URL to navigate to
 */
export function getNotificationUrl(data) {
    if (!data) return '/notifications';

    // If backend explicitly provides an action_url, always use it
    if (data.action_url) return data.action_url;

    const type = data.type;

    switch (type) {
        case 'order_confirmed':
            return data.order_id ? `/orders/${data.order_id}` : '/my-purchases';

        case 'delivery_requested':
            return data.order_id
                ? `/delivery?tab=pending&order_id=${data.order_id}`
                : '/delivery';

        case 'delivery_accepted':
            return data.order_id ? `/orders/${data.order_id}` : '/my-purchases';

        case 'complaint_responded':
        case 'complaint_new_message':
            return '/complaints';

        case 'offer_created':
            return data.offer_id ? `/offers?offer_id=${data.offer_id}` : '/offers';

        case 'admin_broadcast':
            return '/notifications';

        default:
            return '/notifications';
    }
}
