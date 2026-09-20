import type { AuthUser, SmartMallRole } from '@/src/types/auth';

const rolePriority: SmartMallRole[] = [
  'super-admin',
  'admin',
  'mall-owner',
  'supermarket-owner',
  'delivery-person',
  'order-tracker',
  'cashier',
  'customer',
];

export function getUserRole(user: AuthUser | null): SmartMallRole {
  if (!user) return 'customer';
  const roleFromResponse = (user as AuthUser & { role?: string }).role;
  const names = [
    ...(roleFromResponse ? [roleFromResponse] : []),
    ...(user.roles ?? []).map((role) => (typeof role === 'string' ? role : role.name)),
  ];
  return rolePriority.find((role) => names.includes(role)) ?? 'customer';
}