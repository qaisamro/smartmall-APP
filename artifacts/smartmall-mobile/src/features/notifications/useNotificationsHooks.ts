import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCustomerNotifications,
  getUnreadNotificationCount,
  markAllCustomerNotificationsAsRead,
  markCustomerNotificationAsRead,
  type CustomerNotification,
} from '@/src/features/notifications/notificationsApi';

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

export function useCustomerNotifications() {
  return useQuery({
    queryKey: notificationQueryKeys.all,
    queryFn: ({ signal }) => getCustomerNotifications(signal),
    staleTime: 30_000,
  });
}

export function useUnreadNotificationCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: notificationQueryKeys.unreadCount,
    queryFn: ({ signal }) => getUnreadNotificationCount(signal),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useMarkCustomerNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markCustomerNotificationAsRead,
    onMutate: async (notificationId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationQueryKeys.all }),
        queryClient.cancelQueries({ queryKey: notificationQueryKeys.unreadCount }),
      ]);

      const previousNotifications = queryClient.getQueryData<CustomerNotification[]>(
        notificationQueryKeys.all,
      );
      const previousUnreadCount = queryClient.getQueryData<{ count: number }>(
        notificationQueryKeys.unreadCount,
      );
      const notification = previousNotifications?.find(({ id }) => id === notificationId);

      if (notification && !notification.read_at) {
        queryClient.setQueryData<CustomerNotification[]>(
          notificationQueryKeys.all,
          previousNotifications?.map((item) =>
            item.id === notificationId
              ? { ...item, read_at: new Date().toISOString() }
              : item,
          ),
        );
        queryClient.setQueryData(notificationQueryKeys.unreadCount, {
          count: Math.max(0, (previousUnreadCount?.count ?? 0) - 1),
        });
      }

      return { previousNotifications, previousUnreadCount };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationQueryKeys.all, context.previousNotifications);
      }
      if (context?.previousUnreadCount) {
        queryClient.setQueryData(notificationQueryKeys.unreadCount, context.previousUnreadCount);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
}

export function useMarkAllCustomerNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllCustomerNotificationsAsRead,
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationQueryKeys.all }),
        queryClient.cancelQueries({ queryKey: notificationQueryKeys.unreadCount }),
      ]);

      const previousNotifications = queryClient.getQueryData<CustomerNotification[]>(
        notificationQueryKeys.all,
      );
      const previousUnreadCount = queryClient.getQueryData<{ count: number }>(
        notificationQueryKeys.unreadCount,
      );

      if (previousNotifications) {
        const readAt = new Date().toISOString();
        queryClient.setQueryData<CustomerNotification[]>(
          notificationQueryKeys.all,
          previousNotifications.map((item) => ({ ...item, read_at: item.read_at ?? readAt })),
        );
      }
      queryClient.setQueryData(notificationQueryKeys.unreadCount, { count: 0 });

      return { previousNotifications, previousUnreadCount };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationQueryKeys.all, context.previousNotifications);
      }
      if (context?.previousUnreadCount) {
        queryClient.setQueryData(notificationQueryKeys.unreadCount, context.previousUnreadCount);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
}