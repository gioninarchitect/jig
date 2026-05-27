import { AsyncLocalStorage } from 'node:async_hooks';

// =====================================================================
// Per-request async context — survives async hops without prop drilling.
//
// Used by audit.service.ts eventBus listener to know:
//   • who the REAL caller is (req.realUser.userId)
//   • whether they're in Ghost Mode (req.ghostAs = ghost target id)
//
// Set once in the auth middleware after JWT verify + ghost resolution.
// Every downstream service call within that request inherits it.
// =====================================================================

export interface RequestContext {
  realUserId: string;
  ghostAsUserId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
