// P37 — Section 21 info: info boxes, step circles, conditions, consultation form (vanilla-matched)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import FAQAccordion from '../../components/storefront/FAQAccordion';

const PROCESS_STEPS = [
  { num: '1', title: 'Consultation', desc: 'Schedule a consultation with a registered healthcare provider.' },
  { num: '2', title: 'Assessment', desc: 'Your doctor assesses your condition and determines eligibility.' },
  { num: '3', title: 'Prescription', desc: 'If approved, your doctor issues a Section 21 prescription.' },
  { num: '4', title: 'Application', desc: 'We submit the SAHPRA application on your behalf.' },
  { num: '5', title: 'Approval', desc: 'SAHPRA reviews and approves the application (typically 2-4 weeks).' },
  { num: '6', title: 'Registration', desc: 'Register your account and upload your approved prescription.' },
  { num: '7', title: 'Access', desc: 'Browse and order Section 21 medical cannabis products.' },
];

const CONDITIONS = [
  'Chronic Pain', 'Epilepsy', 'Multiple Sclerosis', 'Cancer-related symptoms',
  'PTSD', 'Anxiety Disorders', 'Fibromyalgia', 'Parkinson\'s Disease',
];

const FAQS = [
  { q: 'What is Section 21?', a: 'Section 21 of the Medicines and Related Substances Act allows registered patients to access unregistered medicines (including cannabis) for medical purposes through a SAHPRA-approved process.' },
  { q: 'How long does approval take?', a: 'SAHPRA approval typically takes 2-4 weeks, depending on application volume and completeness of documentation.' },
  { q: 'What documents do I need?', a: 'You need a valid Section 21 prescription from a registered healthcare provider, your ID document, and proof of address.' },
  { q: 'Can I order without a prescription?', a: 'No. Section 21 products are strictly prescription-only. You can browse our lifestyle products without a prescription.' },
  { q: 'Is medical cannabis legal in South Africa?', a: 'Yes, when accessed through the Section 21 pathway with a valid SAHPRA-approved prescription from a registered healthcare provider.' },
];

export default function Section21InfoPage() {
  const [consultForm, setConsultForm] = useState({ name: '', email: '', phone: '', condition: '', message: '' });
  const [consultStatus, setConsultStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);

  async function handleConsult(e) {
    e.preventDefault();
    if (!consultForm.name || !consultForm.email || !consent) return;
    setSubmitting(true);
    try {
      await api.post('/leads', { ...consultForm, source: 'section21_consultation' });
      setConsultStatus('success');
      setConsultForm({ name: '', email: '', phone: '', condition: '', message: '' });
      setConsent(false);
    } catch {
      setConsultStatus('error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #8B6914 100%)' }} className="py-16 sm:py-24 border-b-[3px] border-or-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl text-white uppercase mb-2">Section 21 Medical Cannabis</h1>
          <p className="text-[1.1rem] text-or-gold-dark font-accent italic" style={{ color: 'rgba(244,240,230,0.8)' }}>
            Access medical-grade cannabis through South Africa's legal Section 21 pathway. Prescribed by doctors, approved by SAHPRA.
          </p>
        </div>
      </section>

      <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-12">
        {/* Info box */}
        <div className="rounded-r-[8px] p-6 mb-8" style={{ background: 'rgba(58,95,72,0.1)', borderLeft: '4px solid #C9A84C' }}>
          <h2 className="font-heading text-xl text-or-gold uppercase mb-2">What is Section 21?</h2>
          <p className="text-white leading-relaxed">
            Section 21 of the Medicines and Related Substances Act (Act 101 of 1965) provides a pathway for patients to access unregistered medicines, including medical cannabis, when prescribed by a registered healthcare provider and approved by SAHPRA.
          </p>
        </div>

        {/* Warning box */}
        <div className="rounded-r-[8px] p-6 mb-10" style={{ background: 'rgba(212,175,55,0.1)', borderLeft: '4px solid #F0A500' }}>
          <p className="text-white">
            <strong>Important:</strong> Medical cannabis is only available through a valid Section 21 prescription. Self-medication without proper medical supervision is not recommended.
          </p>
        </div>

        {/* 7-Step Process */}
        <h2 className="font-heading text-[2rem] text-or-gold uppercase mt-8 mb-6">The Process</h2>
        <div className="space-y-4 mb-12">
          {PROCESS_STEPS.map((step) => (
            <div
              key={step.num}
              className="bg-white rounded-[12px] p-6 flex gap-4 items-start"
              style={{ border: '1px solid rgba(58,95,72,0.2)' }}
            >
              <div className="w-10 h-10 bg-or-gold rounded-full flex items-center justify-center shrink-0">
                <span className="text-gray-100 font-bold text-lg leading-[40px]">{step.num}</span>
              </div>
              <div>
                <h3 className="font-semibold text-or-gold-dark text-lg">{step.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Requirements + Conditions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          <div>
            <h2 className="font-heading text-xl text-or-gold uppercase mb-4">Requirements</h2>
            <ul className="space-y-3">
              {['Valid Section 21 prescription from a registered doctor', 'South African ID document', 'Proof of residential address', 'Completed registration on our platform', 'Upload of approved prescription document'].map((req) => (
                <li key={req} className="flex gap-3 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-or-gold shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 512 512"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-heading text-xl text-or-gold uppercase mb-4">Qualifying Conditions</h2>
            <div className="grid grid-cols-2 gap-3">
              {CONDITIONS.map((cond) => (
                <div key={cond} className="bg-white rounded-[10px] px-4 py-3 text-sm text-gray-700" style={{ border: '1px solid rgba(58,95,72,0.2)' }}>
                  {cond}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">This is not an exhaustive list. Consult your healthcare provider for eligibility.</p>
          </div>
        </div>

        {/* Consultation Journey Hero */}
        <div
          className="rounded-[16px] p-8 sm:p-10 mb-8 text-center"
          style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #8B6914 100%)', border: '3px solid #F0A500' }}
        >
          <h2 className="font-heading text-3xl text-gray-100 uppercase mb-4">Start Your Journey</h2>
          <p className="text-gray-100/90 mb-6">Request a consultation with one of our registered healthcare providers.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: 'Consult', label: 'Free Consultation' },
              { icon: 'Assess', label: 'Medical Assessment' },
              { icon: 'Apply', label: 'SAHPRA Application' },
              { icon: 'Access', label: 'Product Access' },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-[12px]" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <h4 className="text-gray-100 font-semibold text-sm">{item.icon}</h4>
                <p className="text-gray-100/90 text-xs mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Consultation Form */}
        <div className="bg-white rounded-[16px] p-8 mb-12" style={{ border: '2px solid #C9A84C' }}>
          <h2 className="font-heading text-2xl text-or-gold uppercase mb-6 text-center">Request a Consultation</h2>
          {consultStatus === 'success' && (
            <div className="text-center p-6 mb-6">
              <div className="text-4xl text-or-gold mb-3">&#10003;</div>
              <h3 className="font-heading text-xl text-or-gold mb-2">Request Submitted</h3>
              <p className="text-or-gold-dark">Our team will contact you to arrange your consultation.</p>
            </div>
          )}
          {consultStatus !== 'success' && (
            <form onSubmit={handleConsult} className="space-y-4">
              <div>
                <label className="block text-or-gold-dark font-semibold mb-1.5 text-sm">Full Name *</label>
                <input type="text" value={consultForm.name} onChange={(e) => setConsultForm((f) => ({ ...f, name: e.target.value }))} required className="w-full px-3 py-3 bg-white border border-or-gold rounded-[8px] text-white focus:outline-none focus:border-or-gold" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-or-gold-dark font-semibold mb-1.5 text-sm">Email *</label>
                  <input type="email" value={consultForm.email} onChange={(e) => setConsultForm((f) => ({ ...f, email: e.target.value }))} required className="w-full px-3 py-3 bg-white border border-or-gold rounded-[8px] text-white focus:outline-none focus:border-or-gold" />
                </div>
                <div>
                  <label className="block text-or-gold-dark font-semibold mb-1.5 text-sm">Phone</label>
                  <input type="tel" value={consultForm.phone} onChange={(e) => setConsultForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-3 bg-white border border-or-gold rounded-[8px] text-white focus:outline-none focus:border-or-gold" />
                </div>
              </div>
              <div>
                <label className="block text-or-gold-dark font-semibold mb-1.5 text-sm">Condition</label>
                <select value={consultForm.condition} onChange={(e) => setConsultForm((f) => ({ ...f, condition: e.target.value }))} className="w-full px-3 py-3 bg-white border border-or-gold rounded-[8px] text-white focus:outline-none focus:border-or-gold">
                  <option value="">Select a condition (optional)</option>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-or-gold-dark font-semibold mb-1.5 text-sm">Additional Information</label>
                <textarea value={consultForm.message} onChange={(e) => setConsultForm((f) => ({ ...f, message: e.target.value }))} rows={3} className="w-full px-3 py-3 bg-white border border-or-gold rounded-[8px] text-white focus:outline-none focus:border-or-gold resize-vertical" />
              </div>
              <label className="flex items-start gap-2 cursor-pointer text-sm text-or-gold-dark">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="accent-or-gold mt-0.5" />
                <span>I consent to being contacted regarding my Section 21 consultation request.</span>
              </label>
              <button type="submit" disabled={submitting || !consent} className="w-full py-3 bg-or-gold text-gray-100 font-semibold rounded-[8px] hover:bg-or-gold-dark hover:-translate-y-px transition-all disabled:opacity-50" style={{ boxShadow: '0 4px 12px rgba(58,95,72,0.3)' }}>
                {submitting ? 'Sending...' : 'Request Consultation'}
              </button>
            </form>
          )}
        </div>

        {/* Prescription Renewal */}
        <div className="rounded-[16px] p-8 mb-12 bg-white" style={{ border: '2px solid rgba(58,95,72,0.2)' }}>
          <h2 className="font-heading text-2xl text-or-gold uppercase mb-4">Prescription Renewal</h2>
          <div className="space-y-3 text-gray-600 leading-relaxed">
            <p>Section 21 prescriptions must be renewed periodically to maintain access to medical cannabis products. Here's what you need to know:</p>
            <ul className="space-y-2 ml-4">
              {[
                'Prescriptions are typically valid for 6-12 months, depending on your healthcare provider.',
                'You will receive a reminder 30 days before your prescription expires.',
                'Renewal requires a follow-up consultation with your prescribing doctor.',
                'Your doctor may adjust your treatment plan based on your progress.',
                'Upload your renewed prescription to your account to maintain uninterrupted access.',
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <svg className="w-4 h-4 text-or-gold shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 512 512"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal & Privacy */}
        <div className="rounded-[16px] p-8 mb-12" style={{ background: 'rgba(58,95,72,0.05)', border: '1px solid rgba(58,95,72,0.15)' }}>
          <h2 className="font-heading text-2xl text-or-gold uppercase mb-4">Legal & Privacy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-or-gold-dark mb-2">Data Protection</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                All medical information is stored securely in compliance with the Protection of Personal Information Act (POPIA). Your prescription documents, medical history, and personal details are encrypted and accessible only to authorized personnel.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-or-gold-dark mb-2">Legal Framework</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Medical cannabis access in South Africa is regulated under Section 21 of the Medicines and Related Substances Act (Act 101 of 1965), administered by SAHPRA. Origin by ILCO Farming operates in full compliance with all applicable regulations.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-or-gold-dark mb-2">Your Rights</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                You have the right to access, correct, or delete your personal data at any time. Contact our privacy officer at <a href="mailto:privacy@origin.cleva-ai.co.za" className="text-or-gold font-semibold">privacy@origin.cleva-ai.co.za</a> for any data-related requests.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-or-gold-dark mb-2">Responsible Use</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Medical cannabis should be used strictly as prescribed by your healthcare provider. Do not operate heavy machinery or drive while under the influence. Keep all products out of reach of children.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mb-12">
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-or-gold text-gray-100 font-semibold rounded-[8px] hover:bg-or-gold-dark hover:-translate-y-0.5 transition-all"
            style={{ boxShadow: '0 4px 12px rgba(58,95,72,0.3)' }}
          >
            Create Your Account
          </Link>
        </div>

        {/* FAQ */}
        <h2 className="font-heading text-2xl text-or-gold uppercase mb-6 text-center">Frequently Asked Questions</h2>
        <FAQAccordion items={FAQS} />
      </div>
    </div>
  );
}
