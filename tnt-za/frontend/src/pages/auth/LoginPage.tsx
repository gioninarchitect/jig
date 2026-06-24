import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Leaf, ArrowRight, Loader2, Mail } from 'lucide-react';

export default function LoginPage() {
  const { requestPin, verifyPin, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('email')?.trim() ?? '';
  });
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [sentNote, setSentNote] = useState('');

  // One step: email + your fixed PIN → log in. No "request a new PIN" gate and no
  // emailed one-time code in the way — testers use the single PIN they were given.
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
    </div>
  );
}
