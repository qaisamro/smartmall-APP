import { apiClient } from '@/src/api/client';

export interface NotificationData {
  [key: string]: unknown;
  type?: string;
  title?: string;
  body?: string;
  message?: string;
  action_url?: string;
  order_id?: number | string;
  offer_id?: number | string;
}

export interface CustomerNotification {
  id: string;
  type: string;
  notifiable_type?: string;
  notifiable_id?: number;
  data: NotificationData | string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnreadNotificationCount {
  count: number;
}

export function parseNotificationData(
  data: CustomerNotification['data'],
): NotificationData {
  if (!data) return {};
  if (typeof data === 'object') return data;

  try {
    const parsed: unknown = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? (parsed as NotificationData) : {};
  } catch {
    return {};
  }
}

export async function getCustomerNotifications(signal?: AbortSignal): Promise<CustomerNotification[]> {
  return (await apiClient.get<CustomerNotification[]>('/notifications', { signal })).data;
}

export async function getUnreadNotificationCount(
  signal?: AbortSignal,
): Promise<UnreadNotificationCount> {
  return (
    await apiClient.get<UnreadNotificationCount>('/notifications/unread-count', { signal })
  ).data;
}

export async function markCustomerNotificationAsRead(id: string): Promise<void> {
  await apiClient.put(`/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllCustomerNotificationsAsRead(): Promise<void> {
  await apiClient.put('/notifications/read-all');
}