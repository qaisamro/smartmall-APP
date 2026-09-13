import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/src/components/AppButton';
import { AppInput } from '@/src/components/AppInput';
import { useCustomerComplaints, useComplaintMessages, useCreateCustomerComplaint, useSendComplaintMessage } from '@/src/features/complaints/useComplaintsHooks';
import { formatDate } from '@/src/utils/numberFormat';

const statusKeys: Record<string, string> = {
  pending: 'complaints.status.pending',
  in_progress: 'complaints.status.in_progress',
  replied: 'complaints.status.replied',
  resolved: 'complaints.status.resolved',
  rejected: 'complaints.status.rejected',
};

export default function ComplaintsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language.startsWith('ar');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mallId, setMallId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const complaintsQuery = useCustomerComplaints();
  const messagesQuery = useComplaintMessages(selectedId);
  const createMutation = useCreateCustomerComplaint();
  const sendMutation = useSendComplaintMessage();

  const createComplaint = () => {
    if (!title.trim() || !description.trim()) return;
    createMutation.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        mall_id: mallId.trim() ? Number(mallId) : null,
        order_id: orderId.trim() || null,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setMallId('');
          setOrderId('');
        },
      },
    );
  };

  const sendReply = () => {
    if (!selectedId || !message.trim()) return;
    sendMutation.mutate(
      { complaintId: selectedId, message: message.trim() },
      { onSuccess: () => setMessage('') },
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30, direction: isAr ? 'rtl' : 'ltr' }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name={isAr ? 'arrow-right' : 'arrow-left'} size={20} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>{t('complaints.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>{t('complaints.subtitle')}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>{t('complaints.new_title')}</Text>
          <AppInput label={t('complaints.subject')} value={title} onChangeText={setTitle} placeholder={t('complaints.subject_placeholder')} />
          <AppInput
            label={t('complaints.description')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('complaints.description_placeholder')}
            multiline
            style={styles.multiline}
          />
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <AppInput label={t('complaints.mall_id')} value={mallId} onChangeText={setMallId} keyboardType="number-pad" placeholder={t('complaints.optional')} />
            </View>
            <View style={styles.column}>
              <AppInput label={t('complaints.order_id')} value={orderId} onChangeText={setOrderId} placeholder={t('complaints.optional')} />
            </View>
          </View>
          <AppButton label={t('complaints.submit')} onPress={createComplaint} loading={createMutation.isPending} disabled={!title.trim() || !description.trim()} />
          {createMutation.isSuccess ? <Text style={[styles.success, { color: colors.success }]}>{t('complaints.sent')}</Text> : null}
          {createMutation.isError ? <Text style={[styles.error, { color: colors.destructive }]}>{t('error.network')}</Text> : null}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>{t('complaints.previous')}</Text>
        {complaintsQuery.isLoading ? <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('common.loading')}</Text> : null}
        {complaintsQuery.isError ? <Text style={[styles.error, { color: colors.destructive }]}>{t('error.network')}</Text> : null}
        {(complaintsQuery.data ?? []).map((complaint) => {
          const selected = selectedId === complaint.id;
          return (
            <View key={complaint.id} style={[styles.card, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border }]}>
              <Pressable onPress={() => setSelectedId(selected ? null : complaint.id)} style={styles.complaintHeader}>
                <View style={styles.complaintCopy}>
                  <Text style={[styles.complaintTitle, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]} numberOfLines={1}>{complaint.title}</Text>
                  <Text style={[styles.muted, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>{formatDate(complaint.created_at, i18n.language)}</Text>
                </View>
                <View style={[styles.status, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[styles.statusText, { color: colors.primary }]}>{t(statusKeys[complaint.status] ?? 'complaints.status.pending')}</Text>
                </View>
              </Pressable>
              {selected ? (
                <View style={[styles.thread, { borderTopColor: colors.divider }]}>
                  <Text style={[styles.description, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>{complaint.description}</Text>
                  {messagesQuery.isLoading ? <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('common.loading')}</Text> : null}
                  {(messagesQuery.data ?? []).map((item) => (
                    <View key={item.id} style={[styles.message, { backgroundColor: item.user_id === complaint.user_id ? colors.primarySoft : colors.muted, alignSelf: item.user_id === complaint.user_id ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.messageText, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>{item.message}</Text>
                    </View>
                  ))}
                  <View style={styles.replyRow}>
                    <View style={styles.replyInput}>
                      <AppInput label={t('complaints.reply')} value={message} onChangeText={setMessage} placeholder={t('complaints.reply_placeholder')} />
                    </View>
                    <Pressable onPress={sendReply} disabled={sendMutation.isPending || !message.trim()} style={[styles.sendButton, { backgroundColor: colors.primary, opacity: sendMutation.isPending || !message.trim() ? 0.5 : 1 }]}>
                      <Feather name="send" size={17} color={colors.primaryForeground} />
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
        {!complaintsQuery.isLoading && (complaintsQuery.data ?? []).length === 0 ? <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('complaints.empty')}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  iconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 3 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 23 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 9 },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 4 },
  multiline: { minHeight: 90, height: undefined, textAlignVertical: 'top', paddingTop: 14 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 6 },
  muted: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19 },
  success: { fontFamily: 'Inter_600SemiBold', fontSize: 13, textAlign: 'center' },
  complaintHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  complaintCopy: { flex: 1, gap: 5 },
  complaintTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  status: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  thread: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, marginTop: 4, gap: 10 },
  description: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  message: { maxWidth: '84%', borderRadius: 14, padding: 11 },
  messageText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  replyInput: { flex: 1 },
  sendButton: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
});