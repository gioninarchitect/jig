import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_REDIRECTS } from '../config/roles';
import PublicLayout from '../layouts/PublicLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const { requestOTP, verifyOTP, verifyPin, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState('email'); // email | otp
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef([]);

  // If already authenticated, redirect to appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname;
      const dest = from || ROLE_REDIRECTS[user.role] || '/customer';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function handleRequestOTP(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestOTP(email);
      setStep('otp');
      setCountdown(60);
      // Focus first OTP input
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(code) {
    setError('');
    setLoading(true);
    try {
      const result = await verifyOTP(email, code);
      if (result.success) {
        const dest = ROLE_REDIRECTS[result.user.role] || '/customer';
        navigate(dest, { replace: true });
      } else {
        setError(result.message || 'Invalid code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(index, value) {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    // Auto-advance
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 filled
    if (digit && index === 5) {
      const code = next.join('');
      if (code.length === 6) handleVerifyOTP(code);
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      e.preventDefault();
      const next = text.split('');
      setOtp(next);
      otpRefs.current[5]?.focus();
      handleVerifyOTP(text);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    setError('');
    try {
      await requestOTP(email);
      setCountdown(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend');
    }
  }

  return (
    <PublicLayout>
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.3)] p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="font-heading text-3xl text-white uppercase">
            {step === 'email' ? 'Sign In' : 'Enter Code'}
          </h2>
          <p className="font-accent text-sm text-gray-500 italic mt-1">
            {step === 'email'
              ? 'Enter your email to receive a login code'
              : `Code sent to ${email}`}
          </p>
        </div>

        {error && (
          <div className="bg-jig-red/10 border border-jig-red/30 text-jig-red text-sm rounded-xl px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleRequestOTP}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              required
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              disabled={loading || !email}
            >
              {loading ? 'Sending...' : 'Send Login Code'}
            </Button>
          </form>
        ) : (
          <div>
            {/* OTP input boxes */}
            <div className="flex justify-center gap-3 mb-6" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl
                    focus:outline-none focus:border-jig-amber focus:shadow-[0_0_0_4px_rgba(124,58,237,0.15)]
                    text-white font-body"
                />
              ))}
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading || otp.join('').length < 6}
              onClick={() => handleVerifyOTP(otp.join(''))}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>

            <div className="text-center mt-4">
              {countdown > 0 ? (
                <p className="text-sm text-gray-400">Resend in {countdown}s</p>
              ) : (
                <button
                  onClick={handleResend}
                  className="text-sm text-jig-purple font-semibold hover:underline"
                >
                  Resend Code
                </button>
              )}
            </div>

            <button
              onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError(''); }}
              className="block mx-auto mt-3 text-sm text-gray-400 hover:text-jig-purple"
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
