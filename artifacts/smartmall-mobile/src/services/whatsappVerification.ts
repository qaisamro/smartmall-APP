import * as Linking from 'expo-linking';
import { apiClient } from '@/src/api/client';

export const WHATSAPP_SUPPORT_NUMBER = '970566288377';

export type WhatsAppVerificationKind = 'register' | 'reset';

export type WhatsAppVerification = {
  kind: WhatsAppVerificationKind;
  phone: string;
  verificationId: string;
  expiresIn: number;
  createdAt: number;
};

type WhatsAppVerificationInput = {
  kind: WhatsAppVerificationKind;
  phone: string;
  name?: string;
};

function buildMessage(input: WhatsAppVerificationInput, verificationId: string): string {
  if (input.kind === 'register') {
    return [
      'مرحباً، أريد تأكيد إنشاء حساب SmartMall.',
      `الاسم: ${input.name ?? ''}`,
      `رقم الهاتف: ${input.phone}`,
      `معرّف الطلب: ${verificationId}`,
    ].join('\n');
  }

  return [
    'مرحباً، أريد إعادة تعيين كلمة مرور حساب SmartMall.',
    `رقم الهاتف: ${input.phone}`,
    `معرّف الطلب: ${verificationId}`,
  ].join('\n');
}

export async function startWhatsAppVerification(
  input: WhatsAppVerificationInput,
): Promise<WhatsAppVerification> {
  const endpoint = input.kind === 'register'
    ? '/whatsapp/register/request'
    : '/whatsapp/reset/request';
  const response = await apiClient.post<{
    verification_id?: string;
    expires_in?: number;
  }>(endpoint, {
    phone: input.phone,
    ...(input.name ? { name: input.name } : {}),
  });

  if (!response.data.verification_id) {
    throw new Error('whatsapp_verification_unavailable');
  }

  const verificationId = response.data.verification_id;
  const message = buildMessage(input, verificationId);
  const whatsappUrl = `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${encodeURIComponent(message)}`;

  try {
    await Linking.openURL(whatsappUrl);
  } catch {
    throw new Error('whatsapp_unavailable');
  }

  return {
    kind: input.kind,
    phone: input.phone,
    verificationId,
    expiresIn: response.data.expires_in ?? 600,
    createdAt: Date.now(),
  };
}

export async function verifyWhatsAppVerification(input: {
  kind: WhatsAppVerificationKind;
  phone: string;
  verificationId: string;
  code: string;
}): Promise<string> {
  const endpoint = input.kind === 'register'
    ? '/whatsapp/register/verify'
    : '/whatsapp/reset/verify';
  const response = await apiClient.post<{ verification_token: string }>(endpoint, {
    phone: input.phone,
    verification_id: input.verificationId,
    code: input.code.trim(),
  });

  return response.data.verification_token;
}