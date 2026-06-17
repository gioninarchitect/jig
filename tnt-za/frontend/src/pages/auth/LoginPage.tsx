import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Leaf, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { requestPin, verifyPin, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'pin'>('email');
  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('email')?.trim() ?? '';
  });
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await requestPin(email);
      setStep('pin');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send PIN');
    }
  }

  async function handlePin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await verifyPin(email, pin);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid PIN');
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

      {step === 'email' ? (
        <form onSubmit={handleEmail} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Email</label>
            <input
              type="email" required autoFocus
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@ilco.co.za"
              className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-primary focus:outline-none transition"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-light text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>Request PIN</span><ArrowRight size={16} /></>}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePin} className="space-y-4">
          <p className="text-sm text-white/50 text-center">PIN sent to <span className="text-primary">{email}</span></p>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">6-Digit PIN</label>
            <input
              type="text" required autoFocus
              maxLength={6} pattern="[0-9]{6}" inputMode="numeric"
              value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white text-center text-2xl font-mono tracking-[0.5em] placeholder:text-white/20 focus:border-primary focus:outline-none transition"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading || pin.length < 6}
            className="w-full py-3 bg-primary hover:bg-primary-light text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><span>Verify</span><ArrowRight size={16} /></>}
          </button>
          <button type="button" onClick={() => { setStep('email'); setPin(''); setError(''); }}
            className="w-full text-sm text-white/40 hover:text-white/60 transition">
            Back to email
          </button>
        </form>
      )}
    </div>
  );
}
