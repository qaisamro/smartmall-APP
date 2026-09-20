import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/src/components/AppButton';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.message, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <MessageState icon="inbox" title={title} message={message} />;
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <MessageState icon="alert-circle" title="Something went wrong" message={message}>
      {onRetry ? <AppButton label="Try again" onPress={onRetry} /> : null}
    </MessageState>
  );
}

function MessageState({
  icon,
  title,
  message,
  children,
}: {
  icon: 'inbox' | 'alert-circle';
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <Feather name={icon} size={30} color={colors.mutedForeground} />
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});