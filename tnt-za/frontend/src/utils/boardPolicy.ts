// Canonical signal/noise policy for work boards — ONE source of truth.
//
// A role's PRIMARY board shows only what THEY must action (their "signal").
// "See everything" is OVERSIGHT — always a deliberate, separate, labelled view,
// never mixed into the default to-do. This stops the facility-wide task backlog
// (hundreds of recurring checklists) from drowning a single person's board.
//
// Consumed by: TasksDueWidget (dashboard), TasksPage (/tasks), KanbanPage (reference impl).

// Roles that legitimately get a facility-wide OVERSIGHT view (in addition to their own queue).
const OVERSIGHT_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'FACILITY_MANAGER', 'HEAD_OF_CULTIVATION'];

// What a role's "what's due / my board" signal is.
//  - 'qa'   → deviations to review + sign-offs + QA/Lab inspections (NOT facility checklists)
//  - 'mine' → tasks assigned to this user (their own action queue)
export type DueSignal = 'qa' | 'mine';

export function dueSignal(role?: string | null): DueSignal {
  return role === 'QA_INSPECTOR' ? 'qa' : 'mine';
}

// Oversight roles may toggle to the all-facility view; everyone else only ever sees their own.
export function isOversightRole(role?: string | null): boolean {
  return OVERSIGHT_ROLES.includes(role || '');
}
