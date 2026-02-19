// P39 — Registration: logo, form card, benefits, terms (vanilla-matched)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const BENEFITS = [
  'Earn wellness points with every purchase',
  'Track your orders in real-time',
  'Access exclusive products and deals',
  'Section 21 medical cannabis eligibility',
  'Refer friends and earn commission',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', agreeTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format.';
    if (!form.phone.trim()) errs.phone = 'Phone number is required.';
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (!form.agreeTerms) errs.agreeTerms = 'You must agree to the terms.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    setServerError('');
    try {
      await api.post('/auth/register', {
        firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, password: form.password,
      });
      navigate('/login', { state: { registered: true, email: form.email } });
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = (field) =>
    `w-full px-4 py-3.5 bg-jig-slate border-2 rounded-[8px] text-white focus:outline-none transition-all ${
      errors[field] ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-jig-purple'
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-jig-slate relative">
      {/* Decorative circles */}
      <div className="fixed top-[-150px] right-[-100px] w-[400px] h-[400px] rounded-full opacity-[0.08] pointer-events-none" style={{ background: 'linear-gradient(135deg, #7C3AED, #D97706)' }} />
      <div className="fixed bottom-[-100px] left-[-80px] w-[300px] h-[300px] rounded-full opacity-[0.08] pointer-events-none" style={{ background: 'linear-gradient(135deg, #D97706, #7C3AED)' }} />

      <div className="w-full max-w-[480px] relative z-10">
        <div
          className="bg-white rounded-[16px] p-8 sm:p-10"
          style={{ boxShadow: '0 4px 24px rgba(42,70,53,0.12)', border: '1px solid rgba(58,95,72,0.1)' }}
        >
          {/* Logo + Brand */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-3 bg-jig-slate rounded-full flex items-center justify-center">
              <span className="font-heading text-2xl text-jig-purple">JIG</span>
            </div>
            <h1 className="font-heading text-[1.75rem] text-jig-purple uppercase tracking-wide">JIG Craft Cannabis</h1>
            <p className="text-[0.8rem] font-medium tracking-wide" style={{ color: '#B8922D' }}>Cultivating Excellence</p>
          </div>

          {serverError && (
            <div className="rounded-[8px] p-3.5 mb-4 text-sm" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626' }}>{serverError}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First Name *" className={inputClass('firstName')} />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Last Name" className={inputClass('lastName')} />
              </div>
            </div>

            <div>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email Address *" className={inputClass('email')} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Phone Number *" className={inputClass('phone')} />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password *" className={inputClass('password')} />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div>
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Confirm Password *" className={inputClass('confirmPassword')} />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input name="agreeTerms" type="checkbox" checked={form.agreeTerms} onChange={handleChange} className="accent-jig-purple w-5 h-5 mt-0.5" />
              <span className="text-sm text-gray-600">
                I agree to the{' '}
                <Link to="/terms" className="text-jig-amber font-semibold hover:underline" target="_blank">Terms & Conditions</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-jig-amber font-semibold hover:underline" target="_blank">Privacy Policy</Link>
              </span>
            </label>
            {errors.agreeTerms && <p className="text-xs text-red-500">{errors.agreeTerms}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 font-heading text-[1.125rem] uppercase tracking-wider bg-jig-purple text-white rounded-[8px] hover:bg-jig-purple-dark hover:-translate-y-px transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ boxShadow: submitting ? 'none' : '0 4px 12px rgba(42,70,53,0.25)' }}
            >
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="px-4 text-xs text-gray-500 uppercase">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-jig-amber font-semibold hover:underline">Login</Link>
          </p>

          {/* Benefits */}
          <div className="mt-6 bg-jig-slate rounded-[12px] p-5" style={{ border: '1px solid rgba(58,95,72,0.1)' }}>
            <h3 className="text-sm font-bold text-jig-purple-dark uppercase tracking-wider mb-3">Member Benefits</h3>
            <ul className="space-y-2">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[0.85rem] text-gray-600">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="#D97706" viewBox="0 0 512 512"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
