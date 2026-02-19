// P37 — Privacy Policy
export default function PrivacyPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-jig-slate via-jig-purple-dark to-jig-purple py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl text-white uppercase">Privacy Policy</h1>
        </div>
      </section>
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-gray">
          <p className="text-sm text-gray-500 mb-6">Last updated: February 2026</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">1. Information We Collect</h2>
          <p className="text-sm text-gray-600 leading-relaxed">We collect personal information you provide during registration, ordering, and account management. This includes your name, email address, phone number, delivery address, and payment details.</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">2. How We Use Your Information</h2>
          <p className="text-sm text-gray-600 leading-relaxed">Your information is used to process orders, manage your account, communicate with you about your orders, and improve our services. We do not sell your personal information to third parties.</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">3. Section 21 Data</h2>
          <p className="text-sm text-gray-600 leading-relaxed">Medical prescription data and Section 21 documentation are handled with strict confidentiality in compliance with POPIA and healthcare regulations. This data is only shared with SAHPRA and your prescribing healthcare provider as required by law.</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">4. Data Security</h2>
          <p className="text-sm text-gray-600 leading-relaxed">We implement appropriate technical and organisational security measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction.</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">5. Cookies</h2>
          <p className="text-sm text-gray-600 leading-relaxed">We use cookies to improve your browsing experience, remember your preferences, and for age verification. You can manage cookie preferences through your browser settings.</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">6. Your Rights (POPIA)</h2>
          <p className="text-sm text-gray-600 leading-relaxed">Under the Protection of Personal Information Act (POPIA), you have the right to access, correct, and delete your personal information. Contact us at info@jig.cleva-ai.co.za to exercise these rights.</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">7. Data Retention</h2>
          <p className="text-sm text-gray-600 leading-relaxed">We retain your personal information only for as long as necessary to fulfil the purposes for which it was collected, or as required by law. Section 21 records are retained as required by SAHPRA regulations.</p>

          <h2 className="font-heading text-xl text-white uppercase mt-8 mb-3">8. Contact</h2>
          <p className="text-sm text-gray-600 leading-relaxed">For privacy-related queries, contact our Information Officer at info@jig.cleva-ai.co.za.</p>
        </div>
      </section>
    </div>
  );
}
