import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  parseNotificationData,
  type CustomerNotification,
  type NotificationData,
} from '@/src/features/notifications/notificationsApi';
import { getNotificationRoute } from '@/src/services/deepLinks';
import { formatDateTime } from '@/src/utils/numberFormat';
import {
  useCustomerNotifications,
  useMarkAllCustomerNotificationsAsRead,
  useMarkCustomerNotificationAsRead,
  useUnreadNotificationCount,
} from '@/src/features/notifications/useNotificationsHooks';

type NotificationIcon = keyof typeof Feather.glyphMap;

const typeTitleKeys: Record<string, string> = {
  order_confirmed: 'notifications.types.order_confirmed',
  delivery_requested: 'notifications.types.delivery_requested',
  delivery_accepted: 'notifications.types.delivery_accepted',
  order_ready_for_delivery: 'notifications.types.order_ready_for_delivery',
  offer_created: 'notifications.types.offer_created',
  admin_broadcast: 'notifications.types.admin_broadcast',
  complaint_responded: 'notifications.types.complaint_responded',
  complaint_new_message: 'notifications.types.complaint_new_message',
};

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getNotificationIcon(type: string): NotificationIcon {
  if (type === 'offer_created') return 'star';
  if (type === 'admin_broadcast') return 'volume-2';
  if (type === 'complaint_responded' || type === 'complaint_new_message') return 'message-square';
  if (
    type === 'delivery_requested' ||
    type === 'delivery_accepted' ||
    type === 'order_ready_for_delivery'
  ) {
    return 'truck';
  }
  if (type === 'order_confirmed') return 'shopping-bag';
  return 'package';
}

function formatNotificationDate(value: string, language: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return formatDateTime(date, {}, language);
}

function getNotificationCopy(
  notification: CustomerNotification,
  data: NotificationData,
  t: (key: string) => string,
) {
  const type = stringValue(data.type) ?? notification.type;
  const title = stringValue(data.title) ?? t(typeTitleKeys[type] ?? 'notifications.types.default');
  const body = stringValue(data.body) ?? stringValue(data.message);

  return { type, title, body };
}

export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const language = i18n.language;
  const direction: 'rtl' | 'ltr' = language.startsWith('ar') ? 'rtl' : 'ltr';
  const notificationsQuery = useCustomerNotifications();
  const unreadCountQuery = useUnreadNotificationCount();
  const markReadMutation = useMarkCustomerNotificationAsRead();
  const markAllReadMutation = useMarkAllCustomerNotificationsAsRead();
  const notifications = notificationsQuery.data ?? [];
  const unreadCount =
    unreadCountQuery.data?.count ??
    notifications.filter((notification) => !notification.read_at).length;

  const openNotification = (notification: CustomerNotification) => {
    if (!notification.read_at) {
      markReadMutation.mutate(notification.id);
    }

    const data = parseNotificationData(notification.data);
    const actionRoute = getNotificationRoute(data);
    if (actionRoute) {
      router.push(actionRoute as never);
      return;
    }
    const orderId = Number(data.order_id);
    if (Number.isInteger(orderId) && orderId > 0) {
      router.push(`/(customer)/order/${orderId}`);
      return;
    }
    if (data.type === 'offer_created') {
      router.push('/(customer)/(tabs)/offers');
    }
  };

  const renderState = () => {
    if (notificationsQuery.isLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t('common.loading')}
          </Text>
        </View>
      );
    }

    if (notificationsQuery.isError) {
      return (
        <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="alert-circle" size={28} color={colors.destructive} />
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>
            {t('error.network')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void notificationsQuery.refetch()}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>
              {t('notifications.retry')}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (notifications.length === 0) {
      return (
        <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
            <Feather name="bell-off" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>
            {t('notifications.empty_title')}
          </Text>
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
            {t('notifications.empty_message')}
          </Text>
        </View>
      );
    }

    return notifications.map((notification) => {
      const data = parseNotificationData(notification.data);
      const { type, title, body } = getNotificationCopy(notification, data, t);
      const isUnread = !notification.read_at;

      return (
        <Pressable
          key={notification.id}
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={() => openNotification(notification)}
          style={({ pressed }) => [
            styles.notificationCard,
            {
              backgroundColor: colors.card,
              borderColor: isUnread ? colors.primary : colors.border,
              opacity: pressed ? 0.78 : 1,
            },
          ]}
        >
          <View style={[styles.notificationRow, { direction }]}>
            <View
              style={[
                styles.unreadRail,
                { backgroundColor: isUnread ? colors.primary : colors.card },
              ]}
            />
            <View
              style={[
                styles.notificationIcon,
                { backgroundColor: isUnread ? colors.primarySoft : colors.muted },
              ]}
            >
              <Feather
                name={getNotificationIcon(type)}
                size={21}
                color={isUnread ? colors.primary : colors.mutedForeground}
              />
            </View>
            <View style={[styles.notificationCopy, { direction }]}>
              <View style={[styles.titleRow, { direction }]}>
                <Text
                  style={[
                    styles.notificationTitle,
                    { color: isUnread ? colors.foreground : colors.mutedForeground, textAlign: language.startsWith('ar') ? 'right' : 'left' },
                  ]}
                  numberOfLines={2}
                >
                  {title}
                </Text>
                {isUnread ? (
                  <View style={[styles.unreadPill, { backgroundColor: colors.primarySoft }]}>
                    <Text style={[styles.unreadPillText, { color: colors.primary }]}>
                      {t('notifications.unread')}
                    </Text>
                  </View>
                ) : null}
              </View>
              {body ? (
                <Text
                  style={[
                    styles.notificationBody,
                    { color: colors.mutedForeground, textAlign: language.startsWith('ar') ? 'right' : 'left' },
                  ]}
                  numberOfLines={3}
                >
                  {body}
                </Text>
              ) : null}
              <View style={[styles.dateRow, { direction }]}>
                <Feather name="clock" size={13} color={colors.mutedForeground} />
                <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                  {formatNotificationDate(notification.created_at, language)}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      );
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, direction }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather
            name={language.startsWith('ar') ? 'arrow-right' : 'arrow-left'}
            size={20}
            color={colors.foreground}
          />
        </Pressable>
        <View style={[styles.headerCopy, { direction }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground, textAlign: language.startsWith('ar') ? 'right' : 'left' }]}>
            {t('notifications.title')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground, textAlign: language.startsWith('ar') ? 'right' : 'left' }]}>
            {t('notifications.subtitle')}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('notifications.mark_all_read')}
            onPress={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            style={({ pressed }) => [
              styles.markAllButton,
              {
                backgroundColor: colors.primarySoft,
                opacity: pressed || markAllReadMutation.isPending ? 0.6 : 1,
              },
            ]}
          >
            <Feather name="check-circle" size={15} color={colors.primary} />
            <Text style={[styles.markAllText, { color: colors.primary }]}>
              {t('notifications.mark_all_read')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 28, direction },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={notificationsQuery.isRefetching}
            onRefresh={() => void notificationsQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderState()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: 3 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 23 },
  headerSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  markAllButton: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  markAllText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  content: { paddingHorizontal: 20, gap: 12 },
  stateContainer: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stateCard: {
    minHeight: 260,
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stateTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, textAlign: 'center' },
  stateText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryButton: {
    minHeight: 42,
    borderRadius: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  notificationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  unreadRail: { width: 3, minHeight: 76, borderRadius: 2 },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCopy: { flex: 1, gap: 7 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  notificationTitle: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 15, lineHeight: 20 },
  notificationBody: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  unreadPill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  unreadPillText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
});