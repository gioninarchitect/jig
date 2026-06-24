// Human-readable role labels. Most roles humanise fine from the enum, but a few
// carry an ILCO-specific display alias (the enum stays the same; only the label changes).
const ROLE_ALIASES: Record<string, string> = {
  FACILITY_SUPERVISOR: 'Cultivation Supervisor',
};

export function roleLabel(role?: string | null): string {
  if (!role) return '';
  return ROLE_ALIASES[role] || role.replace(/_/g, ' ');
}
