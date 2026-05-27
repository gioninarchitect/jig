/**
 * PureGro Premium Cannabis Care - OTP Login & Registration Page
 *
 * Three modes:
 *   1. Login: Enter email -> request OTP -> verify & redirect
 *   2. Register: Fill form -> create account -> OTP verify -> redirect
 *   3. OTP: Enter 6-digit code -> verify & redirect
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { auth as authApi } from '../api';

type Step = 'login' | 'register' | 'otp';

export default function LoginPage() {
  const { status, requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Registration fields
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (status === 'authenticated') navigate('/', { replace: true });
  }, [status, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Login: request OTP ──────────────────────────────────

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await requestOtp(email.trim().toLowerCase());
      setCountdown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setStep('otp');
      setLoading(false);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  };

  // ── Register: create account + send OTP ─────────────────

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.register({
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        registrationNumber: registrationNumber.trim() || undefined,
      });
      setCountdown(60);
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP handlers ────────────────────────────────────────

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
    if (submittingRef.current) return;
    submittingRef.current = true;
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
      submittingRef.current = false;
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

  // ── Shared input class ──────────────────────────────────

  const inputCls =
    'w-full rounded border border-white/[0.1] bg-pg-gray-900 px-3.5 py-2.5 text-sm text-pg-white outline-none transition-all placeholder:text-pg-gray-700 focus:border-pg-green focus:ring-2 focus:ring-pg-green/15';

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-pg-black px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="PureGro Premium Cannabis Care" className="mx-auto h-24 w-auto" />
          <p className="mt-3 font-heading text-[11px] font-medium uppercase tracking-[0.2em] text-pg-gray-500">
            Wholesale Portal
          </p>
        </div>

        <div className="rounded-lg border border-white/[0.08] bg-pg-dark p-6">

          {/* ── LOGIN FORM ──────────────────────────── */}
          {step === 'login' && (
            <form onSubmit={handleEmailSubmit}>
              <h2 className="mb-1 font-heading text-lg font-semibold uppercase tracking-wide text-pg-white">
                Sign In
              </h2>
              <p className="mb-6 text-sm text-pg-gray-500">
                Enter your email to receive a one-time code.
              </p>

              <label className="mb-1.5 block font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                Email address
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.co.za"
                className={`mb-4 ${inputCls}`}
              />

              {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-pg-gradient px-4 py-3 font-heading text-[13px] font-semibold uppercase tracking-[0.08em] text-pg-white transition-all hover:-translate-y-0.5 hover:shadow-pg-glow disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? 'Sending...' : 'Send Code'}
              </button>

              <p className="mt-4 text-center text-sm text-pg-gray-500">
                New client?{' '}
                <button
                  type="button"
                  onClick={() => { setStep('register'); setError(''); }}
                  className="font-medium text-pg-green transition-colors hover:text-pg-green-light"
                >
                  Register here
                </button>
              </p>
            </form>
          )}

          {/* ── REGISTER FORM ───────────────────────── */}
          {step === 'register' && (
            <form onSubmit={handleRegisterSubmit}>
              <h2 className="mb-1 font-heading text-lg font-semibold uppercase tracking-wide text-pg-white">
                Register
              </h2>
              <p className="mb-5 text-sm text-pg-gray-500">
                Create your wholesale account.
              </p>

              <label className="mb-1 block font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                Company Name
              </label>
              <input
                type="text"
                required
                autoFocus
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Cannabis (Pty) Ltd"
                className={`mb-3 ${inputCls}`}
              />

              <label className="mb-1 block font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                Contact Person
              </label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="John Smith"
                className={`mb-3 ${inputCls}`}
              />

              <label className="mb-1 block font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.co.za"
                className={`mb-3 ${inputCls}`}
              />

              <label className="mb-1 block font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+27 82 123 4567"
                className={`mb-3 ${inputCls}`}
              />

              <label className="mb-1 block font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                Registration Number <span className="normal-case tracking-normal text-pg-gray-700">(optional)</span>
              </label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="2024/XXXXXX/07"
                className={`mb-4 ${inputCls}`}
              />

              {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-pg-gradient px-4 py-3 font-heading text-[13px] font-semibold uppercase tracking-[0.08em] text-pg-white transition-all hover:-translate-y-0.5 hover:shadow-pg-glow disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <p className="mt-4 text-center text-sm text-pg-gray-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setStep('login'); setError(''); }}
                  className="font-medium text-pg-green transition-colors hover:text-pg-green-light"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* ── OTP VERIFICATION ────────────────────── */}
          {step === 'otp' && (
            <div>
              <h2 className="mb-1 font-heading text-lg font-semibold uppercase tracking-wide text-pg-white">
                Enter Code
              </h2>
              <p className="mb-6 text-sm text-pg-gray-500">
                We sent a 6-digit code to{' '}
                <span className="font-medium text-pg-white">{email}</span>
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
                    className="h-12 w-12 rounded border border-white/[0.1] bg-pg-gray-900 text-center text-lg font-semibold text-pg-white outline-none transition-all focus:border-pg-green focus:ring-2 focus:ring-pg-green/15"
                  />
                ))}
              </div>

              {error && (
                <p className="mb-4 text-sm text-red-400">{error}</p>
              )}

              {loading && (
                <p className="mb-4 text-center text-sm text-pg-gray-500">Verifying...</p>
              )}

              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => { setStep('login'); setError(''); }}
                  className="text-pg-gray-500 transition-colors hover:text-pg-white"
                >
                  Change email
                </button>
                <button
                  onClick={handleResend}
                  disabled={countdown > 0 || loading}
                  className="text-pg-green transition-colors hover:text-pg-green-light disabled:text-pg-gray-700"
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
