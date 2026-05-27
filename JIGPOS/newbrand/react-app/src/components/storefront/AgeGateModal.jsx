// P36 — Full-screen age verification overlay. DOB dropdowns, stores origin_age_verified in localStorage
import { useState, useMemo } from 'react';

const STORAGE_KEY = 'origin_age_verified';

function isVerified() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export default function AgeGateModal() {
  const [show, setShow] = useState(!isVerified());
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
  const months = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ], []);
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, i) => current - i);
  }, []);

  if (!show) return null;

  function handleVerify() {
    setError('');
    if (!day || !month || !year) {
      setError('Please select your full date of birth.');
      return;
    }
    const birthDate = new Date(Number(year), months.indexOf(month), Number(day));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      setError('You must be 18 or older to access this site.');
      return;
    }
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  }

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-origin-slate/95">
      <div className="bg-white rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.4)] max-w-md w-full p-8 text-center animate-[modalSlide_0.3s_ease-out]">
        {/* Logo */}
        <div className="w-16 h-16 bg-gradient-to-br from-or-gold to-or-gold-dark rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-white font-heading text-2xl">D</span>
        </div>

        <h2 className="font-heading text-2xl text-white uppercase mb-2">Age Verification</h2>
        <p className="text-sm text-gray-600 mb-6">
          You must be 18 years or older to access this website. Please enter your date of birth.
        </p>

        {/* DOB dropdowns */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="px-3 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-or-gold transition-colors"
          >
            <option value="">Day</option>
            {days.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-or-gold transition-colors"
          >
            <option value="">Month</option>
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-or-gold transition-colors"
          >
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-origin-red font-medium mb-4">{error}</p>}

        <button
          onClick={handleVerify}
          className="w-full py-3 text-sm font-bold uppercase tracking-wider bg-gradient-to-br from-or-gold-light via-or-gold to-or-gold-dark text-gray-900 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          Verify Age
        </button>

        <p className="text-xs text-gray-400 mt-4">
          By entering this site you agree to our{' '}
          <span className="text-or-gold underline cursor-pointer">Terms & Conditions</span> and{' '}
          <span className="text-or-gold underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
