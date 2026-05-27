// P37 — Contact page: hero, 2-col: info (circular icons) + form (with subject). POST /leads
import { useState } from 'react';
import api from '../../services/api';

const SUBJECT_OPTIONS = [
  'General Inquiry',
  'Product Information',
  'Order Support',
  'Franchise Opportunity',
  'Business Partnership',
  'Feedback',
  'Other',
];

const CONTACT_METHODS = [
  {
    label: 'Phone',
    value: '+27 67 291 9110',
    note: 'Mon-Fri: 8AM - 5PM',
    icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 512 512"><path d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z"/></svg>,
  },
  {
    label: 'Email',
    value: 'hello@origin.cleva-ai.co.za',
    note: 'Response within 24 hours',
    icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 512 512"><path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48L48 64zM0 176L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-208L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/></svg>,
  },
  {
    label: 'WhatsApp',
    value: '+27 67 291 9110',
    note: 'Quick support via WhatsApp',
    icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>,
  },
  {
    label: 'Head Office',
    value: 'Potchefstroom, North West, South Africa',
    note: null,
    icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 384 512"><path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>,
  },
  {
    label: 'Business Hours',
    value: 'Mon-Sat 9AM-5PM, Sun Closed',
    note: null,
    icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 512 512"><path d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120l0 136c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2 280 120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>,
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.subject || !form.message) return;
    setSubmitting(true);
    setStatus(null);
    try {
      await api.post('/leads', { name: `${form.firstName} ${form.lastName}`, email: form.email, phone: form.phone, subject: form.subject, message: form.message, source: 'contact_page' });
      setStatus('success');
      setForm({ firstName: '', lastName: '', email: '', phone: '', subject: '', message: '' });
      setTimeout(() => setStatus(null), 5000);
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-or-gold py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-white uppercase mb-4">Get In Touch</h1>
          <p className="text-lg text-white/70 max-w-2xl">
            Have questions? We're here to help. Reach out and we'll get back to you as soon as possible.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 sm:py-20 bg-origin-slate">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Info */}
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl text-or-gold uppercase mb-3">Contact Information</h2>
              <p className="text-gray-500 mb-8">We'd love to hear from you. Reach out through any of the channels below.</p>
              <div className="space-y-5">
                {CONTACT_METHODS.map((m) => (
                  <div key={m.label} className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-full bg-or-gold flex items-center justify-center text-gray-100 shrink-0 hover:bg-or-gold-dark transition-colors">
                      {m.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm uppercase tracking-wider mb-0.5">{m.label}</h3>
                      <p className="text-gray-700">{m.value}</p>
                      {m.note && <p className="text-xs text-gray-400 mt-0.5">{m.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl p-8 sm:p-10" style={{ boxShadow: '0 4px 20px rgba(58,95,72,0.1)' }}>
              <h2 className="font-heading text-2xl text-or-gold uppercase mb-6">Send Us A Message</h2>

              {status === 'success' && (
                <div className="bg-or-gold/10 border border-or-gold/30 text-or-gold rounded-lg p-4 mb-6 text-sm">Thank you! We'll get back to you shortly.</div>
              )}
              {status === 'error' && (
                <div className="bg-origin-red/10 border border-origin-red/30 text-origin-red rounded-lg p-4 mb-6 text-sm">Something went wrong. Please try again.</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-or-gold-dark mb-1.5">First Name *</label>
                    <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required className="w-full px-4 py-3 bg-origin-slate border-2 border-transparent rounded-lg text-white focus:outline-none focus:border-or-gold focus:shadow-[0_0_0_3px_rgba(58,95,72,0.1)] transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-or-gold-dark mb-1.5">Last Name *</label>
                    <input type="text" name="lastName" value={form.lastName} onChange={handleChange} required className="w-full px-4 py-3 bg-origin-slate border-2 border-transparent rounded-lg text-white focus:outline-none focus:border-or-gold focus:shadow-[0_0_0_3px_rgba(58,95,72,0.1)] transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-or-gold-dark mb-1.5">Email Address *</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full px-4 py-3 bg-origin-slate border-2 border-transparent rounded-lg text-white focus:outline-none focus:border-or-gold focus:shadow-[0_0_0_3px_rgba(58,95,72,0.1)] transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-or-gold-dark mb-1.5">Phone Number</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="w-full px-4 py-3 bg-origin-slate border-2 border-transparent rounded-lg text-white focus:outline-none focus:border-or-gold focus:shadow-[0_0_0_3px_rgba(58,95,72,0.1)] transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-or-gold-dark mb-1.5">Subject *</label>
                  <select name="subject" value={form.subject} onChange={handleChange} required className="w-full px-4 py-3 bg-origin-slate border-2 border-transparent rounded-lg text-white focus:outline-none focus:border-or-gold focus:shadow-[0_0_0_3px_rgba(58,95,72,0.1)] transition-all">
                    <option value="">Select a subject</option>
                    {SUBJECT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-or-gold-dark mb-1.5">Message *</label>
                  <textarea name="message" value={form.message} onChange={handleChange} required rows={5} className="w-full px-4 py-3 bg-origin-slate border-2 border-transparent rounded-lg text-white focus:outline-none focus:border-or-gold focus:shadow-[0_0_0_3px_rgba(58,95,72,0.1)] transition-all resize-vertical" style={{ minHeight: '150px' }} />
                </div>
                <button type="submit" disabled={submitting} className="w-full py-3.5 font-bold uppercase tracking-wider bg-or-gold text-white rounded-lg hover:bg-or-gold-dark hover:-translate-y-0.5 transition-all disabled:opacity-60">
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
