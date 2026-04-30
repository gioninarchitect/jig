import { useAuthStore } from '../stores/authStore';

const ROLE_LEVELS: Record<string, number> = {
  SUPER_ADMIN: 5, TENANT_ADMIN: 4, RESPONSIBLE_PHARMACIST: 4,
  FACILITY_MANAGER: 3, PROCESSING_MANAGER: 3, FACILITY_SUPERVISOR: 3, QA_INSPECTOR: 3,
  GMP_PARTNER: 3,
  CULTIVATOR: 2, LAB_TECH: 2, IRRIGATION_TECH: 2,
  MAINTENANCE_MANAGER: 3, HEAD_OF_CULTIVATION: 3, NURSERY_MANAGER: 3, PROCESSING_SUPERVISOR: 2, DELIVERY_DRIVER: 1,
  SECURITY_OFFICER: 1, TRIMMER: 1, GENERAL_WORKER: 1, HOUSEKEEPING: 1, LAUNDRY: 1,
  CLIENT: 0, VIEWER: 0,
};

export function useRBAC() {
  const user = useAuthStore((s) => s.user);
  const level = user ? (ROLE_LEVELS[user.role] ?? 0) : -1;

  return {
    level,
    hasRole: (...roles: string[]) => !!user && roles.includes(user.role),
    hasMinLevel: (min: number) => level >= min,
    canAccess: (minLevel: number) => level >= minLevel,
  };
}
