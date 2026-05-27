// P40 — Affiliate: gradient-text hero, commission badge, benefits, tabbed forms, dashboard (vanilla-matched)
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency } from '../../config';
import FAQAccordion from '../../components/storefront/FAQAccordion';

const BENEFITS = [
  { title: '15% Commission', desc: 'Earn 15% on every sale made through your referral link.', icon: 'R' },
  { title: 'Real-Time Tracking', desc: 'Monitor clicks, conversions, and commissions in your dashboard.', icon: '#' },
  { title: 'Monthly Payouts', desc: 'Get paid monthly via EFT. Minimum threshold R100.', icon: '$' },
  { title: 'Exclusive Materials', desc: 'Access branded marketing assets and product descriptions.', icon: '*' },
];

const FAQS = [
  { q: 'How much commission do I earn?', a: 'You earn 15% commission on every sale made through your unique referral link or code.' },
  { q: 'When do I get paid?', a: 'Commissions are paid out monthly via EFT, with a minimum threshold of R100.' },
  { q: 'Can anyone become an affiliate?', a: 'Yes! Anyone over 18 can apply. We review all applications within 48 hours.' },
  { q: 'How do I track my referrals?', a: 'Your affiliate dashboard shows real-time data on clicks, conversions, and commission earned.' },
  { q: 'Is there a cost to join?', a: 'No. The Origin by ILCO Farming affiliate program is completely free to join.' },
];

export default function AffiliatePage() {
  const [mode, setMode] = useState('hero');
  const [formTab, setFormTab] = useState('signup');
  const [form, setForm] = useState({ name: '', email: '', phone: '', website: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [dashboard, setDashboard] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSignup(e) {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setSubmitting(true); setError('');
    try {
      await api.post('/affiliate/register', form);
      setSuccess('Application submitted! Check your email for next steps.');
      setMode('hero');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally { setSubmitting(false); }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!loginForm.email) return;
    setSubmitting(true); setError('');
    try {
      const res = await api.post('/affiliate/login', loginForm);
      if (res.data.token) localStorage.setItem('affiliateToken', res.data.token);
      loadDashboard();
      setMode('dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally { setSubmitting(false); }
  }

  async function loadDashboard() {
    try {
      const [dashRes, commRes] = await Promise.all([api.get('/affiliate/dashboard'), api.get('/affiliate/commissions')]);
      setDashboard(dashRes.data);
      setCommissions(commRes.data.commissions || commRes.data || []);
    } catch { setDashboard(null); }
  }

  useEffect(() => {
    const token = localStorage.getItem('affiliateToken');
    if (token) { loadDashboard(); setMode('dashboard'); }
  }, []);

  return (
    <div>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #8B6914 100%)', borderBottom: '4px solid #F0A500' }} className="py-16 sm:py-20 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Logo circle */}
          <div className="w-[120px] h-[120px] mx-auto mb-8 bg-origin-slate rounded-full flex items-center justify-center" style={{ border: '4px solid #F0A500', boxShadow: '0 0 40px rgba(212,175,55,0.4)' }}>
            <span className="font-heading text-3xl text-or-gold">Origin</span>
          </div>

          <h1
            className="font-heading text-[3rem] uppercase mb-5"
            style={{ background: 'linear-gradient(45deg, #0E0E0E, #E8C45A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '3px' }}
          >
            Affiliate Program
          </h1>
          <p className="text-[1.5rem] text-gray-100 mb-8">
            Earn 15% commission on every sale. Join South Africa's fastest-growing cannabis affiliate network.
          </p>

          {/* Commission badge */}
          <div
            className="inline-block px-8 py-4 rounded-full text-[1.8rem] font-bold text-gray-100 mb-8"
            style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #8B6914 100%)', boxShadow: '0 10px 30px rgba(212,175,55,0.3)' }}
          >
            15% Commission
          </div>

          {mode === 'hero' && (
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={() => setMode('form')} className="px-10 py-4 font-bold uppercase tracking-wider rounded-full text-gray-100 hover:scale-105 transition-all" style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #8B6914 100%)', boxShadow: '0 10px 30px rgba(212,175,55,0.4)' }}>
                Join Now
              </button>
              <button onClick={() => { setMode('form'); setFormTab('login'); }} className="px-10 py-4 font-bold uppercase tracking-wider border-2 border-white/30 text-white rounded-full hover:bg-white/10 transition-all">
                Affiliate Login
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Benefits */}
      {mode !== 'dashboard' && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-3xl text-white uppercase mb-10 text-center">Why Join?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className="rounded-[15px] p-8 text-center border-2 border-or-gold transition-all hover:-translate-y-1"
                  style={{ background: 'linear-gradient(135deg, #fff, #0E0E0E)', boxShadow: '0 4px 15px rgba(58,95,72,0.08)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 10px 30px rgba(212,175,55,0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 15px rgba(58,95,72,0.08)'; }}
                >
                  <div className="text-4xl mb-4">{b.icon}</div>
                  <h3 className="text-[1.3rem] text-white font-semibold mb-2">{b.title}</h3>
                  <p className="text-sm text-gray-500">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {success && (
        <div className="max-w-xl mx-auto px-4 mt-8">
          <div className="rounded-[8px] p-4 text-sm text-center" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid #C9A84C', color: '#1A1A1A' }}>{success}</div>
        </div>
      )}

      {/* Form (signup/login tabs) */}
      {mode === 'form' && (
        <section className="py-16 bg-origin-slate">
          <div className="max-w-[600px] mx-auto px-4">
            <div className="rounded-[20px] p-10" style={{ background: 'linear-gradient(135deg, #fff, #0E0E0E)', border: '3px solid #F0A500' }}>
              {/* Tabs */}
              <div className="flex justify-center gap-3 mb-8">
                {[{ key: 'signup', label: 'Sign Up' }, { key: 'login', label: 'Login' }].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { setFormTab(t.key); setError(''); }}
                    className="px-8 py-3 rounded-full font-semibold text-sm transition-all"
                    style={{
                      background: formTab === t.key ? '#F0A500' : '#0E0E0E',
                      borderColor: formTab === t.key ? '#1A1A1A' : '#e8e8e8',
                      border: '2px solid',
                      color: formTab === t.key ? '#1A1A1A' : '#737373',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {error && <div className="rounded-[8px] p-3 mb-4 text-sm" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #f5f5f5', color: '#f5f5f5' }}>{error}</div>}

              {formTab === 'signup' && (
                <form onSubmit={handleSignup} className="space-y-5">
                  <div>
                    <label className="block text-or-gold-dark text-sm uppercase tracking-wide mb-2">Full Name *</label>
                    <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="w-full px-3 py-3 bg-origin-slate border border-gray-200 rounded-[8px] text-white focus:outline-none focus:border-origin-slate" />
                  </div>
                  <div>
                    <label className="block text-or-gold-dark text-sm uppercase tracking-wide mb-2">Email *</label>
                    <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required className="w-full px-3 py-3 bg-origin-slate border border-gray-200 rounded-[8px] text-white focus:outline-none focus:border-origin-slate" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-or-gold-dark text-sm uppercase tracking-wide mb-2">Phone</label>
                      <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-3 bg-origin-slate border border-gray-200 rounded-[8px] text-white focus:outline-none focus:border-origin-slate" />
                    </div>
                    <div>
                      <label className="block text-or-gold-dark text-sm uppercase tracking-wide mb-2">Website</label>
                      <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className="w-full px-3 py-3 bg-origin-slate border border-gray-200 rounded-[8px] text-white focus:outline-none focus:border-origin-slate" />
                    </div>
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-4 text-white font-bold uppercase tracking-wider rounded-full hover:scale-105 transition-all disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #8B6914 100%)', boxShadow: '0 10px 30px rgba(212,175,55,0.4)' }}>
                    {submitting ? 'Submitting...' : 'Apply Now'}
                  </button>
                  <button type="button" onClick={() => setMode('hero')} className="w-full text-center text-sm text-gray-400 hover:text-or-gold">Cancel</button>
                </form>
              )}

              {formTab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-or-gold-dark text-sm uppercase tracking-wide mb-2">Email</label>
                    <input type="email" value={loginForm.email} onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))} required className="w-full px-3 py-3 bg-origin-slate border border-gray-200 rounded-[8px] text-white focus:outline-none focus:border-origin-slate" />
                  </div>
                  <div>
                    <label className="block text-or-gold-dark text-sm uppercase tracking-wide mb-2">Password</label>
                    <input type="password" value={loginForm.password} onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))} className="w-full px-3 py-3 bg-origin-slate border border-gray-200 rounded-[8px] text-white focus:outline-none focus:border-origin-slate" />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-4 text-white font-bold uppercase tracking-wider rounded-full hover:scale-105 transition-all disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #8B6914 100%)', boxShadow: '0 10px 30px rgba(212,175,55,0.4)' }}>
                    {submitting ? 'Logging in...' : 'Login'}
                  </button>
                  <button type="button" onClick={() => setMode('hero')} className="w-full text-center text-sm text-gray-400 hover:text-or-gold">Cancel</button>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Dashboard */}
      {mode === 'dashboard' && dashboard && (
        <section className="py-12 bg-origin-slate">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-[20px] p-8" style={{ background: 'linear-gradient(135deg, #fff, #0E0E0E)' }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6" style={{ borderBottom: '2px solid #e8e8e8' }}>
                <h2 className="font-heading text-2xl text-white uppercase">Your Dashboard</h2>
                {dashboard.referralCode && (
                  <div className="bg-or-gold px-5 py-2.5 rounded-[10px] font-mono text-[1.2rem] font-bold">{dashboard.referralCode}</div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-8">
                {[
                  { label: 'Total Clicks', value: dashboard.clicks || 0 },
                  { label: 'Conversions', value: dashboard.conversions || 0 },
                  { label: 'Commission Earned', value: formatCurrency(dashboard.totalEarned || 0) },
                  { label: 'Pending Payout', value: formatCurrency(dashboard.pendingPayout || 0) },
                ].map((s) => (
                  <div key={s.label} className="rounded-[10px] p-5 text-center" style={{ background: 'rgba(58,95,72,0.1)', border: '1px solid #C9A84C' }}>
                    <div className="text-[2.5rem] font-bold text-white">{s.value}</div>
                    <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Commissions table */}
              {commissions.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm mt-5">
                    <thead>
                      <tr className="bg-or-gold text-white">
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Order</th>
                        <th className="px-4 py-3 text-left">Amount</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e8e8e8' }}>
                          <td className="px-4 py-3 text-gray-600">{c.date ? new Date(c.date).toLocaleDateString('en-ZA') : '-'}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-900">{c.orderId?.slice(-8) || '-'}</td>
                          <td className="px-4 py-3 font-bold text-white">{formatCurrency(c.amount || 0)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              c.status === 'paid' ? 'bg-blue-500 text-white' : 'bg-or-gold text-white'
                            }`}>
                              {c.status || 'pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl text-white uppercase mb-8 text-center">Frequently Asked Questions</h2>
          <FAQAccordion items={FAQS} />
        </div>
      </section>
    </div>
  );
}
