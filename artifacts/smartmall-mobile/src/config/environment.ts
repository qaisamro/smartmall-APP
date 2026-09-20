import { z } from 'zod';

const environmentSchema = z.object({
  apiBaseUrl: z.string().url(),
  environment: z.enum(['development', 'staging', 'production']),
});

const environmentName = process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? 'development' : 'production');
const configuredApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const defaultLaravelApiUrl = 'https://samrtmall.cloud/api/v1';

if (environmentName !== 'production' && !configuredApiUrl) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL is required for non-production builds');
}

export const environment = environmentSchema.parse({
  apiBaseUrl: configuredApiUrl ?? defaultLaravelApiUrl,
  environment: environmentName,
});

if (__DEV__) {
  console.info('[SmartMall API environment]', {
    apiBaseUrl: environment.apiBaseUrl,
    environment: environment.environment,
  });
}