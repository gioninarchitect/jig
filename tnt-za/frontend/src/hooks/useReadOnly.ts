import { useLocation } from 'react-router-dom';
import { useRBAC } from './useRBAC';

// True when the current user may only VIEW the page they're on (oversight, no edits).
// Drives hiding/disabling write controls; the backend is the hard guard.
// e.g. QA (Keke) reviewing cultivation + processing pages.
export function useReadOnly(): boolean {
  const { isReadOnlyPath } = useRBAC();
  const location = useLocation();
  return isReadOnlyPath(location.pathname);
}
