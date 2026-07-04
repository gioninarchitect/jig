import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Leaf, ArrowRight, Loader2, Mail, KeyRound } from 'lucide-react';

type Mode = 'pin' | 'sso';

export default function LoginPage() {
  const { requestPin, verifyPin, requestSsoCode, verifySsoCode, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('email')?.trim() ?? '';
  });
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [sentNote, setSentNote] = useState('');

  // SSO (FLOCORE email-code) mode. PIN stays the fallback and default so nothing
  // regresses if the backend has SSO disabled (FLOCORE_SSO_ENABLED=false → 404).
  const [mode, setMode] = useState<Mode>('pin');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');

  // One step: email + your fixed PIN → log in.
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await verifyPin(email, pin);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Wrong email or PIN');
    }
  }

  // Optional fallback: only if someone forgot their PIN and needs a one-time code emailed.
  async function handleEmailCode() {
    setError(''); setSentNote('');
    if (!email) { setError('Enter your email first'); return; }
    try {
      await requestPin(email);
      setSentNote('A one-time PIN was emailed to you — you can enter it above instead.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not email a PIN');
    }
  }

  // SSO: request the FLOCORE email code, then verify it.
  async function handleSsoRequest(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email) { setError('Enter your email first'); return; }
    try {
      await requestSsoCode(email);
      setCodeSent(true);
    } catch (err: any) {
      // Backend returns 404 when SSO is disabled — steer the user back to PIN.
      if (err.response?.status === 404) { setMode('pin'); setError('Email-code sign-in is not enabled — use your PIN.'); return; }
      setError(err.response?.data?.error || 'Could not send code');
    }
  }

  async function handleSsoVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await verifySsoCode(email, code);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 503) { setMode('pin'); setError('Sign-in service is busy — use your PIN.'); return; }
      setError(err.response?.data?.error || 'Invalid or expired code');
    }
  }

  return (
    <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-8 shadow-2xl">
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Leaf size={22} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Origin</h1>
          <p className="text-xs text-white/40">Track & Trace — Origin Farming</p>
        </div>
      </div>

      {mode === 'pin' && (
        <>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Email</label>
              <input
                type="email" required autoFocus={!email}
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ilcofarming.co.za"
                className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-primary focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Your PIN</label>
              <input
                type="text" required autoFocus={!!email}
                maxLength={6} pattern="[0-9]{6}" inputMode="numeric"
                value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white text-center text-2xl font-mono tracking-[0.5em] placeholder:text-white/20 focus:border-primary focus:outline-none transition"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {sentNote && <p className="text-primary text-sm">{sentNote}</p>}
            <button
              type="submit" disabled={loading || pin.length < 6 || !email}
              className="w-full py-3 bg-primary hover:bg-primary-light text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>Log in</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <button type="button" onClick={handleEmailCode} disabled={loading}
            className="w-full mt-5 text-xs text-white/35 hover:text-white/60 transition flex items-center justify-center gap-1.5">
            <Mail size={12} /> Forgot your PIN? Email me a one-time code
          </button>
          <button type="button" onClick={() => { setMode('sso'); setError(''); setSentNote(''); }} disabled={loading}
            className="w-full mt-2 text-xs text-white/35 hover:text-white/60 transition flex items-center justify-center gap-1.5">
            <KeyRound size={12} /> Sign in with an email code instead
          </button>
        </>
      )}

      {mode === 'sso' && (
        <>
          {!codeSent ? (
            <form onSubmit={handleSsoRequest} className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Email</label>
                <input
                  type="email" required autoFocus
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@ilcofarming.co.za"
                  className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-primary focus:outline-none transition"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading || !email}
                className="w-full py-3 bg-primary hover:bg-primary-light text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><Mail size={16} /><span>Email me a code</span></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSsoVerify} className="space-y-4">
              <p className="text-sm text-white/50">Enter the 6-digit code we emailed to <span className="text-white/80">{email}</span>.</p>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Email code</label>
                <input
                  type="text" required autoFocus
                  maxLength={6} pattern="[0-9]{6}" inputMode="numeric"
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white text-center text-2xl font-mono tracking-[0.5em] placeholder:text-white/20 focus:border-primary focus:outline-none transition"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading || code.length < 6}
                className="w-full py-3 bg-primary hover:bg-primary-light text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>Log in</span><ArrowRight size={16} /></>}
              </button>
              <button type="button" onClick={() => { setCodeSent(false); setCode(''); setError(''); }} disabled={loading}
                className="w-full text-xs text-white/35 hover:text-white/60 transition">Use a different email</button>
            </form>
          )}
          <button type="button" onClick={() => { setMode('pin'); setCodeSent(false); setCode(''); setError(''); }} disabled={loading}
            className="w-full mt-5 text-xs text-white/35 hover:text-white/60 transition flex items-center justify-center gap-1.5">
            <KeyRound size={12} /> Use my PIN instead
          </button>
        </>
      )}
    </div>
  );
}
