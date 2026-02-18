/**
 * JIG Craft Cannabis - OTP Login Page
 *
 * Two-step flow:
 *   1. Enter email -> request OTP
 *   2. Enter 6-digit code -> verify & redirect
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

type Step = 'email' | 'otp';

export default function LoginPage() {
  const { status, requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (status === 'authenticated') navigate('/', { replace: true });
  }, [status, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await requestOtp(email.trim().toLowerCase());
      setStep('otp');
      setCountdown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== '')) {
      submitOtp(next.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split('');
      setOtp(digits);
      submitOtp(pasted);
    }
  };

  const submitOtp = async (code: string) => {
    setError('');
    setLoading(true);

    try {
      const success = await verifyOtp(email.trim().toLowerCase(), code);
      if (success) {
        navigate('/', { replace: true });
      } else {
        setError('Invalid code. Please try again.');
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    } catch {
      setError('Verification failed. Please try again.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError('');
    setLoading(true);
    try {
      await requestOtp(email.trim().toLowerCase());
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-jig-black px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="JIG Craft Cannabis" className="mx-auto h-24 w-auto" />
          <p className="mt-3 font-heading text-[11px] font-medium uppercase tracking-[0.2em] text-jig-gray-500">
            Wholesale Portal
          </p>
        </div>

        <div className="rounded-lg border border-white/[0.08] bg-jig-slate p-6">
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit}>
              <h2 className="mb-1 font-heading text-lg font-semibold uppercase tracking-wide text-jig-white">
                Sign In
              </h2>
              <p className="mb-6 text-sm text-jig-gray-500">
                Enter your email to receive a one-time code.
              </p>

              <label className="mb-1.5 block font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-jig-gray-500">
                Email address
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.co.za"
                className="mb-4 w-full rounded border border-white/[0.1] bg-jig-gray-900 px-3.5 py-2.5 text-sm text-jig-white outline-none transition-all placeholder:text-jig-gray-700 focus:border-jig-purple focus:ring-2 focus:ring-jig-purple/15"
              />

              {error && (
                <p className="mb-4 text-sm text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-jig-gradient px-4 py-3 font-heading text-[13px] font-semibold uppercase tracking-[0.08em] text-jig-white transition-all hover:-translate-y-0.5 hover:shadow-jig-glow disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? 'Sending...' : 'Send Code'}
              </button>
            </form>
          ) : (
            <div>
              <h2 className="mb-1 font-heading text-lg font-semibold uppercase tracking-wide text-jig-white">
                Enter Code
              </h2>
              <p className="mb-6 text-sm text-jig-gray-500">
                We sent a 6-digit code to{' '}
                <span className="font-medium text-jig-white">{email}</span>
              </p>

              {/* OTP input boxes */}
              <div className="mb-4 flex justify-between gap-2" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="h-12 w-12 rounded border border-white/[0.1] bg-jig-gray-900 text-center text-lg font-semibold text-jig-white outline-none transition-all focus:border-jig-purple focus:ring-2 focus:ring-jig-purple/15"
                  />
                ))}
              </div>

              {error && (
                <p className="mb-4 text-sm text-red-400">{error}</p>
              )}

              {loading && (
                <p className="mb-4 text-center text-sm text-jig-gray-500">Verifying...</p>
              )}

              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => { setStep('email'); setError(''); }}
                  className="text-jig-gray-500 transition-colors hover:text-jig-white"
                >
                  Change email
                </button>
                <button
                  onClick={handleResend}
                  disabled={countdown > 0 || loading}
                  className="text-jig-purple transition-colors hover:text-jig-purple-light disabled:text-jig-gray-700"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
