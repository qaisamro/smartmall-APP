import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

const isNative = () => Capacitor.isNativePlatform();

/**
 * Formats المدعومة في SmartMall - تشمل كل أنواع باركود المنتجات والـ QR المستخدمة فعلياً
 * EAN13/EAN8/UPC للمنتجات، Code128/Code39 للباركود الداخلي، QR للمحلات والطلبات
 */
const SUPPORTED_FORMATS = [
  BarcodeFormat.QrCode,
  BarcodeFormat.Ean13,
  BarcodeFormat.Ean8,
  BarcodeFormat.UpcA,
  BarcodeFormat.UpcE,
  BarcodeFormat.Code128,
  BarcodeFormat.Code39,
  BarcodeFormat.DataMatrix,
  BarcodeFormat.Pdf417,
  BarcodeFormat.Aztec,
  BarcodeFormat.Codabar,
  BarcodeFormat.Itf,
];

export const isNativeScannerAvailable = async () => {
  if (!isNative()) return false;
  try {
    const { supported } = await BarcodeScanner.isSupported();
    return supported;
  } catch {
    return false;
  }
};

export const checkCameraPermission = async () => {
  if (!isNative()) return 'granted';
  try {
    const { camera } = await BarcodeScanner.checkPermissions();
    return camera; // 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'
  } catch {
    return 'denied';
  }
};

export const requestCameraPermission = async () => {
  if (!isNative()) return 'granted';
  try {
    const { camera } = await BarcodeScanner.requestPermissions();
    return camera;
  } catch {
    return 'denied';
  }
};

/**
 * مسح native لمرة واحدة - يعيد نص الباركود/QR بنفس شكل Web scanner
 * يستخدم واجهة جاهزة (scan) التي لا تتطلب إذن كاميرا يدوي على Android (Google Play Services)
 */
export const scanNative = async () => {
  // تأكد من توفر الوحدة على Android
  try {
    const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (!available) {
      await BarcodeScanner.installGoogleBarcodeScannerModule();
    }
  } catch {
    // تجاهل - سيحاول scan على أي حال
  }

  const { barcodes } = await BarcodeScanner.scan({
    formats: SUPPORTED_FORMATS,
  });

  if (!barcodes || barcodes.length === 0) {
    throw new Error('no_barcode');
  }
  // نعيد نفس الشكل الذي يتوقعه الكود الحالي: decodedText string
  return barcodes[0].rawValue || barcodes[0].displayValue || '';
};

export const openAppSettings = async () => {
  if (!isNative()) return;
  try {
    await BarcodeScanner.openSettings();
  } catch {}
};

export { isNative as isNativePlatform };
