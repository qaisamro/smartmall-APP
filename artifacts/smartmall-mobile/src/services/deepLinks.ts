import * as Linking from 'expo-linking';

const allowedRoutes = new Set([
  'malls',
  'search',
  'profile',
  'reset-password',
  'order',
  'complaints',
  'tracking',
  'notifications',
  'offers',
]);

export function createAppLink(route: string, params?: Record<string, string>): string {
  if (!allowedRoutes.has(route)) return Linking.createURL('/');
  return Linking.createURL(route, { queryParams: params });
}

export function getInitialAppLink() {
  return Linking.getInitialURL();
}

export function getAppRouteFromUrl(url: string): string | null {
  const parsed = Linking.parse(url);
  const path = (parsed.path ?? '').replace(/^\/+/, '');
  const query = parsed.queryParams ?? {};
  const id = typeof query.id === 'string' ? query.id : null;

  const orderMatch = path.match(/^(?:orders?|order)\/(\d+)$/);
  if (orderMatch) return `/(customer)/order/${orderMatch[1]}`;
  if (path === 'order' && id && /^\d+$/.test(id)) return `/(customer)/order/${id}`;
  if (path === 'order-tracking' || path === 'tracking') return '/(customer)/tracking';
  if (path === 'complaints') return '/(customer)/complaints';
  if (path === 'notifications') return '/(customer)/notifications';
  if (path === 'offers') return '/(customer)/(tabs)/offers';
  if (path === 'profile' || path === 'customer/settings') return '/(customer)/(tabs)/profile';
  if (path === 'malls') return '/(customer)/(tabs)/malls';
  if (path === 'search') return '/(customer)/(tabs)/search';
  return null;
}

export function getNotificationRoute(data: Record<string, unknown>): string | null {
  const actionUrl = typeof data.action_url === 'string' ? data.action_url : null;
  if (actionUrl) {
    const route = getAppRouteFromUrl(actionUrl);
    if (route) return route;
  }

  const orderId = Number(data.order_id);
  if (Number.isInteger(orderId) && orderId > 0) return `/(customer)/order/${orderId}`;
  const complaintId = Number(data.complaint_id);
  if (Number.isInteger(complaintId) && complaintId > 0) return '/(customer)/complaints';
  if (data.type === 'offer_created') return '/(customer)/(tabs)/offers';
  if (data.type === 'delivery_requested' || data.type === 'delivery_accepted' || data.type === 'order_ready_for_delivery') {
    return '/(customer)/tracking';
  }
  return null;
}