// Single source of truth for the facility's room structure, used across every
// zone-based form (Activity Log, IPM Scouting, Daily Check, Env Log, etc.) so the
// area pills are consistent: the real rooms (MR1/MR2/GH1/GH2/Clone), not generic
// "Mother Bay / Greenhouse". Per-form config is resolved by zone FAMILY.

export type ZoneFamily = 'MOTHER' | 'CLONE' | 'GREENHOUSE';

export interface FacilityZone { key: string; label: string; short: string; family: ZoneFamily; }

export const FACILITY_ZONES: FacilityZone[] = [
  { key: 'MR1', label: 'Mother Room 1 · MR1', short: 'MR1', family: 'MOTHER' },
  { key: 'MR2', label: 'Mother Room 2 · MR2', short: 'MR2', family: 'MOTHER' },
  { key: 'CLONE_ROOM', label: 'Clone Room', short: 'Clone', family: 'CLONE' },
  { key: 'GH1', label: 'Greenhouse 1 · GH1', short: 'GH1', family: 'GREENHOUSE' },
  { key: 'GH2', label: 'Greenhouse 2 · GH2', short: 'GH2', family: 'GREENHOUSE' },
];

// Resolve a stored zone key (incl. legacy MOTHER_BAY/GREENHOUSE) to its family.
export function zoneFamily(key: string): ZoneFamily {
  const z = FACILITY_ZONES.find(z => z.key === key);
  if (z) return z.family;
  if (/^MR\d|MOTHER/i.test(key)) return 'MOTHER';
  if (/^GH\d|GREEN/i.test(key)) return 'GREENHOUSE';
  if (/CLONE/i.test(key)) return 'CLONE';
  return 'GREENHOUSE';
}

export function zoneLabel(key: string): string {
  return FACILITY_ZONES.find(z => z.key === key)?.label ?? key;
}
