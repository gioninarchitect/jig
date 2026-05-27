// P37 — Terms & Conditions
export default function TermsPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-origin-slate via-or-gold-dark to-or-gold py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl text-white uppercase">Terms & Conditions</h1>
        </div>
      </section>
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-gray">
          <p className="text-sm text-gray-500 mb-6">Last updated: February 2026</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">1. Acceptance of Terms</h2>
          <p className="text-sm text-gray-600 leading-relaxed">By accessing and using the Origin by ILCO Farming website and services, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">2. Age Requirement</h2>
          <p className="text-sm text-gray-600 leading-relaxed">You must be at least 18 years of age to use this website and purchase products. By using our services, you confirm that you meet this age requirement.</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">3. Products & Ordering</h2>
          <p className="text-sm text-gray-600 leading-relaxed">All products are subject to availability. We reserve the right to limit quantities and to discontinue any product at any time. Prices are in South African Rand (ZAR) and are subject to change without notice.</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">4. Section 21 Products</h2>
          <p className="text-sm text-gray-600 leading-relaxed">Medical cannabis products require a valid Section 21 prescription approved by SAHPRA. Providing false documentation is a criminal offence. We verify all prescriptions before fulfilling orders.</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">5. Payment</h2>
          <p className="text-sm text-gray-600 leading-relaxed">We accept EFT bank transfers. Orders are processed once proof of payment is received and verified. No cash on delivery is available at this time.</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">6. Returns & Refunds</h2>
          <p className="text-sm text-gray-600 leading-relaxed">Due to the nature of our products, returns are only accepted for damaged or incorrect items. Contact our support team within 48 hours of receiving your order.</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">7. Limitation of Liability</h2>
          <p className="text-sm text-gray-600 leading-relaxed">Origin by ILCO Farming shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services.</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">8. Contact</h2>
          <p className="text-sm text-gray-600 leading-relaxed">For questions about these terms, contact us at info@origin.cleva-ai.co.za.</p>
        </div>
      </section>
    </div>
  );
}
