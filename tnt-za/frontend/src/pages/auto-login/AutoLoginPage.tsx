import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';
import { Loader2, AlertTriangle } from 'lucide-react';

// =====================================================================
// Auto-login handoff — for stakeholder demo CTAs from the status HTML doc.
//
// URL: /auto-login?as=super&to=/ipm-scouting
//
// Maps a role alias → seeded credentials, verifies the PIN, stashes the
// JWT + user into the auth store, then navigates to `to`. Skips the
// normal PIN-input LoginPage entirely.
//
// Seeded creds (from prisma/seed.ts):
//   super       → superilco@cleva-ai.co.za / 991122  (SUPER_ADMIN)
//   admin       → adminilco@cleva-ai.co.za / 882233  (TENANT_ADMIN)
//   fm          → fmilco@cleva-ai.co.za    / 773344  (FACILITY_MANAGER)
//   cultivator  → growerilco@cleva-ai.co.za / 664455 (CULTIVATOR)
//   lab         → labilco@cleva-ai.co.za    / 555666 (LAB_TECH)
//   security    → securityilco@cleva-ai.co.za / 446677 (SECURITY_OFFICER)
//   viewer      → inspector@cleva-ai.co.za   / 337788 (VIEWER — regulator)
// =====================================================================

const CREDS: Record<string, { email: string; pin: string; label: string }> = {
  super:      { email: 'superilco@cleva-ai.co.za',    pin: '991122', label: 'Super Admin' },
  admin:      { email: 'adminilco@cleva-ai.co.za',    pin: '882233', label: 'Tenant Admin / Owner' },
  loraine:    { email: 'loraineilco@cleva-ai.co.za',  pin: '228855', label: 'Loraine — Cultivation Admin (T&A, HR)' },
  fm:         { email: 'fmilco@cleva-ai.co.za',       pin: '773344', label: 'Facility Manager' },
  cultivator: { email: 'growerilco@cleva-ai.co.za',   pin: '664455', label: 'Cultivator' },
  trimmer:    { email: 'trimmerilco@cleva-ai.co.za',  pin: '119922', label: 'Trimmer' },
  lab:        { email: 'labilco@cleva-ai.co.za',      pin: '555666', label: 'Lab Technician' },
  security:   { email: 'securityilco@cleva-ai.co.za', pin: '446677', label: 'Security Officer' },
  viewer:     { email: 'inspector@cleva-ai.co.za',    pin: '337788', label: 'Inspector / Regulator' },
};

export default function AutoLoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const [status, setStatus] = useState<'working' | 'error'>('working');
  const [message, setMessage] = useState('');

  const asRole = params.get('as') ?? 'super';
  const to = params.get('to') ?? '/dashboard';

  useEffect(() => {
    const creds = CREDS[asRole];
    if (!creds) {
      setStatus('error');
      setMessage(`Unknown role "${asRole}". Try ?as=super|admin|fm|cultivator|lab|security|viewer`);
      return;
    }

    (async () => {
      try {
        const { data } = await api.post('/auth/verify-pin', {
          email: creds.email,
          pin: creds.pin,
        });
        if (!data?.token || !data?.user) {
          throw new Error('No token returned');
        }
        login(data.token, data.user);
        // Small tick so the store write settles before the redirect
        setTimeout(() => navigate(to, { replace: true }), 80);
      } catch (err: any) {
        setStatus('error');
        setMessage(err?.response?.data?.error ?? err?.message ?? 'Auto-login failed');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asRole, to]);

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        {status === 'working' ? (
          <>
            <Loader2 className="mx-auto text-amber-400 animate-spin mb-4" size={36} />
            <h1 className="text-xl font-bold text-white mb-1">Signing in…</h1>
            <p className="text-sm text-white/50">
              {CREDS[asRole]?.label ?? asRole} · routing to <code className="text-amber-300 font-mono text-xs">{to}</code>
            </p>
          </>
        ) : (
          <>
            <AlertTriangle className="mx-auto text-red-400 mb-4" size={36} />
            <h1 className="text-xl font-bold text-white mb-1">Auto-login failed</h1>
            <p className="text-sm text-red-300 mb-4">{message}</p>
            <a href="/login" className="inline-block px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold">
              Go to login
            </a>
          </>
        )}
      </div>
    </div>
  );
}
