import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, Text, View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

export interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const AppInput = forwardRef<TextInput, AppInputProps>(({ label, error, style, ...props }, ref) => {
  const colors = useColors();
  
  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>}
      <TextInput
        ref={ref}
        style={[
          styles.input,
          { 
            backgroundColor: colors.card,
            borderColor: error ? colors.destructive : colors.border,
            color: colors.foreground,
          },
          style,
        ]}
        placeholderTextColor={colors.mutedForeground}
        {...props}
      />
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  error: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 4,
  }
});
