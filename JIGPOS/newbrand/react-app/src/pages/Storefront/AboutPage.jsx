// P37 — About page: hero, story (border-left), mission (checkmarks), values (icon cards), what we offer (green bg), CTA
import { Link } from 'react-router-dom';

const VALUES = [
  { title: 'Quality First', desc: 'Every product is lab-tested and verified for purity, potency, and safety.', icon: <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 512 512"><path d="M211 7.3C205 1 196-1.4 187.6 .8s-14.9 8.9-17.1 17.3L154.7 80.6l-62-17.5c-8.4-2.4-17.4 0-23.5 6.1s-8.5 15.1-6.1 23.5l17.5 62L18.1 170.6c-8.4 2.2-14.9 8.9-17.1 17.3s.4 17.4 6.7 23.5L57.5 256 7.7 300.6c-6.3 6.1-9.1 15.1-6.7 23.5s8.9 14.9 17.3 17.1l62.5 15.8-17.5 62c-2.4 8.4 0 17.4 6.1 23.5s15.1 8.5 23.5 6.1l62-17.5 15.8 62.5c2.2 8.4 8.9 14.9 17.3 17.1s17.4-.4 23.5-6.7L256 454.5l44.4 49.8c6.1 6.3 15.1 9.1 23.5 6.7s14.9-8.9 17.1-17.3l15.8-62.5 62 17.5c8.4 2.4 17.4 0 23.5-6.1s8.5-15.1 6.1-23.5l-17.5-62 62.5-15.8c8.4-2.2 14.9-8.9 17.1-17.3s-.4-17.4-6.7-23.5L454.5 256l49.8-44.4c6.3-6.1 9.1-15.1 6.7-23.5s-8.9-14.9-17.3-17.1l-62.5-15.8 17.5-62c2.4-8.4 0-17.4-6.1-23.5s-15.1-8.5-23.5-6.1l-62 17.5L341.4 18.1c-2.2-8.4-8.9-14.9-17.3-17.1s-17.4 .4-23.5 6.7L256 57.5 211 7.3z"/></svg> },
  { title: 'Customer-Centric', desc: 'Full cannabinoid profiles, origin traceability, and honest pricing.', icon: <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 640 512"><path d="M144 0a80 80 0 1 1 0 160A80 80 0 1 1 144 0zM512 0a80 80 0 1 1 0 160A80 80 0 1 1 512 0zM0 298.7C0 239.8 47.8 192 106.7 192l42.7 0c15.9 0 31 3.5 44.6 9.7c-1.3 7.2-1.9 14.7-1.9 22.3c0 38.2 16.8 72.5 43.3 96l-.2 0-21.3 0C155.7 320 112 363.7 112 422.4l0 1.6c0 2.7 .1 5.4 .4 8l-43 0C31.2 432 0 400.8 0 362.4l0-63.7zM528 432l-43 0c.3-2.6 .4-5.3 .4-8l0-1.6c0-58.7-43.7-106.4-100.3-106.4l-21.3 0-.2 0c26.5-23.5 43.3-57.8 43.3-96c0-7.6-.7-15-1.9-22.3c13.6-6.3 28.7-9.7 44.6-9.7l42.7 0C592.2 192 640 239.8 640 298.7l0 63.7c0 38.4-31.2 69.6-69.6 69.6zM320 128a96 96 0 1 1 0 192 96 96 0 1 1 0-192zm-94.8 256l189.6 0c55.2 0 100 44.8 100 100c0 6.6-5.4 12-12 12l-365.6 0c-6.6 0-12-5.4-12-12c0-55.2 44.8-100 100-100z"/></svg> },
  { title: 'Natural Wellness', desc: 'Supporting local growers, farms, and communities across South Africa.', icon: <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 512 512"><path d="M272 96c-78.6 0-145.1 51.5-167.7 122.5c33.6-17 71.5-26.5 111.7-26.5l88 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-16 0-72 0s0 0 0 0c-16.6 0-32.7 1.9-48.3 5.4c-25.9 5.9-49.9 16.4-71.4 30.7c0 0 0 0 0 0C38.3 298.8 0 364.9 0 440l0 16c0 13.3 10.7 24 24 24s24-10.7 24-24l0-16c0-48.7 20.7-92.5 53.8-123.2C121.6 392.3 190.3 448 272 448l1 0c132.1-.7 239-130.9 239-291.4c0-42.6-7.5-83.1-21.1-119.6c-2.6-7-8.6-12.3-15.8-14.2c-7.2-1.9-14.8-.2-20.5 4.6C419.5 58.3 376.8 76.3 330.2 85C307.2 89.2 289.6 96 272 96z"/></svg> },
  { title: 'Compliance & Safety', desc: 'Fully Section 21 compliant. Medical products handled with strict protocol.', icon: <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 512 512"><path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0z"/></svg> },
  { title: '24/7 Convenience', desc: 'Smart stock, potency tracking, and predictive systems — world-first technology.', icon: <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 512 512"><path d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120l0 136c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2 280 120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg> },
  { title: 'Education', desc: 'Empowering customers with knowledge about cannabis wellness and responsible use.', icon: <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 640 512"><path d="M320 32c-8.1 0-16.1 1.4-23.7 4.1L15.8 137.4C6.3 140.9 0 149.9 0 160s6.3 19.1 15.8 22.6l57.9 20.9C57.3 229.3 48 259.8 48 291.9l0 28.1c0 28.4-10.8 57.7-22.3 80.8c-6.5 13-13.9 25.8-22.5 37.6C0 442.7-.9 448.3 .9 453.4s6 8.9 11.2 10.2l64 16c4.2 1.1 8.7 .3 12.4-2s6.3-6.1 7.1-10.4c8.6-42.8 4.3-81.2-2.1-108.7C90.3 344.3 86 329.8 80 316.5l0-24.6c0-30.2 10.2-58.7 27.9-81.5c12.9-15.5 29.6-28 49.2-35.7l157-61.7c8.2-3.2 17.5 .8 20.7 9s-.8 17.5-9 20.7l-157 61.7c-12.4 4.9-23.3 12.4-32.2 21.6l159.6 57.6c7.6 2.7 15.6 4.1 23.7 4.1s16.1-1.4 23.7-4.1L624.2 182.6c9.5-3.4 15.8-12.5 15.8-22.6s-6.3-19.1-15.8-22.6L343.7 36.1C336.1 33.4 328.1 32 320 32zM128 408c0 35.3 86 72 192 72s192-36.7 192-72l0-120.4-155.4 56.1c-8.7 3.1-17.8 4.7-27 4.7s-18.3-1.6-27-4.7L128 287.6 128 408z"/></svg> },
];

const MISSION_ITEMS = [
  'Lab-tested, quality-assured products at every location',
  'Full Section 21 compliance for medical cannabis',
  'Transparent cannabinoid profiles on every product',
  'Expert staff trained in cannabis wellness',
  'Community-driven approach supporting local growers',
];

const OFFER_ITEMS = [
  { title: 'Lifestyle Products', desc: 'CBD oils, edibles, accessories, apparel, and wellness products.' },
  { title: 'Section 21 Medical', desc: 'Prescription cannabis products for registered patients.' },
  { title: 'Expert Guidance', desc: 'Trained staff at every location to help you find the right product.' },
  { title: 'Potchefstroom + Online', desc: 'Convenient access from our North West location or shop online nationwide.' },
  { title: 'Quality Assurance', desc: 'Every product reviewed and approved through our MDC system.' },
  { title: 'Wellness Points', desc: 'Earn rewards with every purchase through our loyalty programme.' },
  { title: 'Online Ordering', desc: 'Browse and order from anywhere — collect at your nearest store.' },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-origin-slate via-or-gold-dark to-or-gold py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-white uppercase mb-4">About Origin by ILCO Farming</h1>
          <p className="text-lg sm:text-xl text-white/70 max-w-2xl font-accent italic">Quality Counts</p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl sm:text-[2.625rem] text-or-gold uppercase mb-8">Our Story</h2>
          <div className="border-l-4 border-or-gold pl-5 space-y-4 text-gray-600 leading-relaxed">
            <p>ILCO Farming (Pty) Ltd is a North West-based agricultural company with deep roots in responsible farming and community wellness. Origin by ILCO Farming was created to bring premium, lab-tested cannabis products directly to consumers through a trusted, compliant retail experience.</p>
            <p>Operating from Potchefstroom with nationwide online delivery, we connect local farms and suppliers directly to customers — with rigorous quality control at every step.</p>
            <p>Our Master Digital Catalogue (MDC) system ensures that every product has been reviewed, tested, and approved by our team. From lifestyle wellness products to Section 21 medical cannabis, quality counts at Origin by ILCO Farming.</p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 sm:py-20 bg-origin-slate">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl sm:text-[2.625rem] text-or-gold uppercase mb-6">Our Mission</h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-8">
            To make premium, lab-tested cannabis products accessible to every South African through a trusted retail network built on transparency, compliance, and expert curation.
          </p>
          <ul className="space-y-3">
            {MISSION_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-or-gold mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 512 512">
                  <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z" />
                </svg>
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-20" style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #8B6914 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl sm:text-[2.625rem] text-gray-100 uppercase mb-10 text-center">Our Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl p-8 text-center hover:-translate-y-1 transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
              >
                <div className="text-or-gold mb-4 flex justify-center">{v.icon}</div>
                <h3 className="font-heading text-xl text-gray-100 uppercase mb-3">{v.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(244,240,230,0.7)' }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Offer — green background like vanilla */}
      <section className="py-16 sm:py-20" style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #8B6914 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl sm:text-[2.625rem] text-gray-100 uppercase mb-8 text-center">What We Offer</h2>
          <div className="space-y-4">
            {OFFER_ITEMS.map((item) => (
              <div key={item.title} className="flex items-start gap-3" style={{ color: 'rgba(244,240,230,0.9)' }}>
                <span className="text-or-gold mt-1 shrink-0">&#9679;</span>
                <p><strong>{item.title}:</strong> {item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-origin-slate">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl text-white uppercase mb-4">Join Our Wellness Community</h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">Experience the Origin by ILCO Farming difference — quality products, expert guidance, and a community built on trust.</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-wider bg-gradient-to-br from-or-gold-light via-or-gold to-or-gold-dark text-gray-900 rounded-xl hover:-translate-y-1 transition-all"
          >
            Shop Now
          </Link>
        </div>
      </section>
    </div>
  );
}
