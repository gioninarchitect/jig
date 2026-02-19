// P37 — Landing page matching vanilla: centered hero, SAHPRA badge, leaf texture, featured products,
// members section, quality counts, locations, begin your journey CTA
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { formatCurrency } from '../../config';
import { useCart } from '../../contexts/CartContext';

const STATS = [
  { value: '8', label: 'Collection Points' },
  { value: '50+', label: 'Premium Products' },
  { value: '100%', label: 'Lab Tested' },
];

const STEPS = [
  { num: '1', title: 'Register', desc: 'Create your secure member account with a valid SA ID', emoji: '\uD83D\uDC64' },
  { num: '2', title: 'Consult', desc: 'Speak with a registered cannabinoid prescriber', emoji: '\uD83E\uDE7A' },
  { num: '3', title: 'Section 21', desc: 'Your doctor submits a SAHPRA application', emoji: '\uD83D\uDCC4' },
  { num: '4', title: 'Collect', desc: 'Pick up your medicine from any collection point', emoji: '\uD83E\uDD1D' },
];

const FEATURES = [
  { title: 'Lab Tested', desc: 'Every product tested for purity, potency, and safety', emoji: '\uD83E\uDDEA' },
  { title: 'SAHPRA Compliant', desc: 'Operating fully within SA legal frameworks', emoji: '\u2696\uFE0F' },
  { title: 'Doctor Network', desc: 'Partner cannabinoid prescribers across SA', emoji: '\uD83C\uDFE5' },
  { title: 'Secure & Private', desc: 'Your information is protected and confidential', emoji: '\uD83D\uDD12' },
];

const LOCATIONS_PREVIEW = [
  { name: 'Ormonde', address: 'Ormonde, Johannesburg South', province: 'Gauteng', hours: 'Mon - Sat: 9:00 - 17:00', open: true },
  { name: 'Spruitview', address: 'Spruitview, Ekurhuleni', province: 'Gauteng', open: false },
  { name: 'Rustenburg', address: 'Rustenburg', province: 'North West', open: false },
  { name: 'Klerksdorp', address: 'Klerksdorp', province: 'North West', open: false },
  { name: 'Mayfair', address: 'Mayfair, Johannesburg', province: 'Gauteng', open: false },
  { name: 'Ladybrand', address: 'Ladybrand', province: 'Free State', open: false },
  { name: 'Ficksburg', address: 'Ficksburg', province: 'Free State', open: false },
  { name: 'Wonderboom', address: 'Wonderboom, Pretoria', province: 'Gauteng', open: false },
];

// Cannabis leaf SVG pattern (inline, repeating)
const LEAF_PATTERN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath d='M50 10 C55 25 70 30 75 45 C65 40 55 42 50 50 C45 42 35 40 25 45 C30 30 45 25 50 10Z' fill='rgba(255,255,255,0.06)'/%3E%3Cpath d='M50 55 L50 90' stroke='rgba(255,255,255,0.04)' stroke-width='1.5'/%3E%3C/svg%3E")`;

export default function LandingPage() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    api
      .get('/products', { params: { category: 'accessories', status: 'active', limit: 6 } })
      .then((res) => {
        const prods = res.data.products || res.data.data || res.data || [];
        setFeatured(Array.isArray(prods) ? prods.slice(0, 6) : []);
      })
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* ══════════ HERO ══════════ */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #7C3AED 0%, #6D28D9 40%, #1E1E1E 100%)' }}
      >
        {/* Cannabis leaf pattern overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: LEAF_PATTERN, backgroundSize: '100px 100px' }} />

        {/* Animated gradient orbs */}
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ background: 'rgba(212,175,55,0.25)' }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[300px] h-[300px] rounded-full blur-[60px] pointer-events-none animate-pulse" style={{ background: 'rgba(166,52,41,0.15)', animationDelay: '4s' }} />

        <div className="max-w-[680px] mx-auto px-4 py-24 sm:py-36 text-center relative z-10">
          {/* SAHPRA Badge */}
          <div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold mb-8"
            style={{
              background: 'rgba(212,175,55,0.15)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(212,175,55,0.4)',
              color: '#D97706',
            }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 512 512"><path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0z" /></svg>
            SAHPRA Compliant &middot; Section 21 Approved
          </div>

          {/* Main heading */}
          <h1 className="font-heading text-[4rem] sm:text-[5rem] text-white uppercase leading-[0.95] mb-2" style={{ textShadow: '0 4px 30px rgba(212,175,55,0.4)' }}>
            De Bud <span className="font-[900]">Chef</span>
          </h1>

          {/* Tagline */}
          <p className="font-accent italic text-[1.1rem] sm:text-[1.35rem] mb-6" style={{ color: '#D97706' }}>
            "Quality Counts &middot; Est. 2026 &middot; Finest Goods"
          </p>

          {/* Description */}
          <p className="text-white/70 text-[1rem] sm:text-[1.1rem] leading-relaxed mb-8 max-w-[500px] mx-auto">
            South Africa's trusted medical cannabis collection points. Expert guidance, premium products, and personalised wellness solutions curated by our specialists.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-wider rounded-xl hover:-translate-y-1 transition-all"
              style={{ background: 'linear-gradient(135deg, #E8C45A 0%, #D97706 50%, #B8922D 100%)', color: '#1A1A1A', boxShadow: '0 15px 40px rgba(212,175,55,0.3)' }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 640 512"><path d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304l91.4 0C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7L29.7 512C13.3 512 0 498.7 0 482.3zM504 312l0-64-64 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l64 0 0-64c0-13.3 10.7-24 24-24s24 10.7 24 24l0 64 64 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-64 0 0 64c0 13.3-10.7 24-24 24s-24-10.7-24-24z" /></svg>
              Become a Member
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-wider border-2 border-white/30 text-white rounded-xl hover:bg-white/10 hover:-translate-y-1 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 512 512"><path d="M40 48C26.7 48 16 58.7 16 72l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24L40 48zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L192 64zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zM16 232l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24l-48 0c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24l0 48c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24l0-48c0-13.3-10.7-24-24-24l-48 0z" /></svg>
              View Menu
            </Link>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-12 sm:gap-16">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-heading text-[3rem] sm:text-[3.5rem] leading-none" style={{ color: '#D97706', textShadow: '0 4px 20px rgba(212,175,55,0.4)' }}>{stat.value}</div>
                <div className="text-[0.7rem] text-white/50 uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-jig-slate">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="text-[0.75rem] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#B8922D' }}>Quality Counts</div>
            <h2 className="font-heading text-[2.5rem] sm:text-[3.5rem] text-jig-purple uppercase">Getting Started</h2>
            <p className="font-accent italic text-gray-500 mt-2">Access legal medical cannabis in four simple steps</p>
          </div>

          <div className="relative sm:contents">
            {/* Edge fade gradients — mobile only */}
            <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none sm:hidden" style={{ background: 'linear-gradient(to right, #0A0A0A, transparent)' }} />
            <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none sm:hidden" style={{ background: 'linear-gradient(to left, #0A0A0A, transparent)' }} />

            <div
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-8 px-4 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 sm:overflow-visible sm:snap-none sm:pb-0 scrollbar-hide"
              style={{ perspective: '1000px' }}
              onScroll={(e) => {
                const el = e.currentTarget;
                const idx = Math.round(el.scrollLeft / (el.scrollWidth / STEPS.length));
                setActiveStep(Math.min(idx, STEPS.length - 1));
              }}
            >
              {STEPS.map((step) => (
                <div
                  key={step.num}
                  className="group relative bg-white rounded-[20px] p-6 sm:p-10 pt-10 sm:pt-12 text-center snap-center flex-[0_0_85%] min-w-[85%] sm:flex-auto sm:min-w-0 transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] hover:-translate-y-3 hover:[transform:translateY(-12px)_rotateX(5deg)]"
                  style={{ transformStyle: 'preserve-3d', boxShadow: '0 10px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)' }}
                >
                  <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-white/80 to-transparent pointer-events-none" />
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full flex items-center justify-center font-heading text-lg z-10" style={{ background: 'linear-gradient(135deg, #E8C45A, #D97706)', color: '#6D28D9', boxShadow: '0 8px 20px rgba(212,175,55,0.4)' }}>
                    {step.num}
                  </div>
                  <div className="w-[80px] h-[80px] rounded-[20px] flex items-center justify-center mx-auto mt-2 mb-6 text-[2rem] transition-all group-hover:scale-105" style={{ background: 'linear-gradient(145deg, #7C3AED, #6D28D9)', boxShadow: '0 15px 35px rgba(45,90,61,0.3), inset 0 1px 0 rgba(255,255,255,0.1)', transform: 'translateZ(20px)' }}>
                    {step.emoji}
                  </div>
                  <h3 className="font-heading text-xl sm:text-[1.4rem] uppercase text-jig-purple tracking-wide mb-2">{step.title}</h3>
                  <p className="text-sm sm:text-[0.9rem] text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>

            {/* Carousel dots — mobile only */}
            <div className="flex justify-center gap-2 mt-4 sm:hidden">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: activeStep === i ? '24px' : '8px',
                    height: '8px',
                    background: activeStep === i ? '#D97706' : 'rgba(58,95,72,0.2)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FEATURED PRODUCTS ══════════ */}
      <section id="menu" className="py-16 sm:py-24" style={{ background: '#1E1E1E' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="text-[0.75rem] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#B8922D' }}>JIG Craft Cannabis Collection</div>
              <h2 className="font-heading text-[2.5rem] sm:text-[3.5rem] text-white uppercase">Our Products</h2>
              <p className="font-accent italic text-white/50 mt-1">Premium glassware, CBD wellness, and lifestyle accessories</p>
            </div>
            <Link to="/products" className="hidden sm:inline-flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-xl hover:-translate-y-1 transition-all" style={{ background: 'linear-gradient(135deg, #E8C45A, #D97706, #B8922D)', color: '#1A1A1A' }}>
              View All
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '4px solid rgba(255,255,255,0.2)', borderTopColor: '#D97706' }} />
            </div>
          ) : featured.length === 0 ? (
            <p className="text-center text-white/40 py-12">No products available yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((product) => {
                const stock = product.inventory?.quantity ?? product.quantity ?? 0;
                return (
                  <div
                    key={product._id}
                    className="bg-white rounded-[24px] overflow-hidden group transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02]"
                    style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)' }}
                  >
                    {/* Image area */}
                    <div className="relative h-[160px] overflow-hidden" style={{ background: 'linear-gradient(145deg, #4A7A5D, #7C3AED)' }}>
                      {product.category && (
                        <span className="absolute top-3 right-3 z-10 px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase" style={{ background: 'linear-gradient(135deg, #E8C45A, #D97706)', color: '#1E1E1E' }}>
                          {product.category}
                        </span>
                      )}
                      {product.images?.[0] || product.image ? (
                        <img src={product.images?.[0] || product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <img src="/app/images/jig-logo-nobg.png" alt="JIG" className="w-20 h-20 object-contain opacity-60" />
                        </div>
                      )}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.3))' }} />
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-heading text-[1.35rem] uppercase text-jig-purple truncate">{product.name}</h3>
                      {product.strain && <p className="text-[0.75rem] uppercase tracking-wider mb-1" style={{ color: '#B8922D' }}>{product.strain}</p>}
                      <p className="text-[0.9rem] text-gray-500 mb-3 line-clamp-2">{product.description || 'Premium quality product'}</p>

                      {/* Stock + Price */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-white rounded-[8px] p-2 text-center" style={{ border: '1px solid #E8E8E8' }}>
                          <div className="text-[0.65rem] text-gray-400 uppercase">Stock</div>
                          <div className="font-heading text-lg text-white">{stock}</div>
                        </div>
                        <div className="bg-white rounded-[8px] p-2 text-center" style={{ border: '1px solid #E8E8E8' }}>
                          <div className="text-[0.65rem] text-gray-400 uppercase">Price</div>
                          <div className="font-heading text-lg" style={{ color: '#DC2626' }}>{formatCurrency(product.price)}</div>
                        </div>
                      </div>

                      {/* Add to Cart */}
                      <button
                        onClick={() => addItem({ productId: product._id, name: product.name, price: product.price, image: product.images?.[0] || product.image, stock })}
                        className="w-full py-3 text-sm font-bold uppercase tracking-wider rounded-[8px] transition-all hover:-translate-y-0.5"
                        style={{ background: 'linear-gradient(135deg, #E8C45A, #D97706, #B8922D)', color: '#1E1E1E', boxShadow: '0 4px 12px rgba(212,175,55,0.3)' }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 576 512"><path d="M0 24C0 10.7 10.7 0 24 0L69.5 0c22 0 41.5 12.8 50.6 32l411 0c26.3 0 45.5 25 38.6 50.4l-41 152.3c-8.5 31.4-37 53.3-69.5 53.3l-288.5 0 5.4 28.5c2.2 11.3 12.1 19.5 23.6 19.5L488 336c13.3 0 24 10.7 24 24s-10.7 24-24 24l-288.3 0c-34.6 0-64.3-24.6-70.7-58.5L77.4 54.5c-.7-3.8-4-6.5-7.9-6.5L24 48C10.7 48 0 37.3 0 24zM128 464a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm336-48a48 48 0 1 1 0 96 48 48 0 1 1 0-96z" /></svg>
                          Add to Cart
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-center mt-8 sm:hidden">
            <Link to="/products" className="text-sm font-semibold text-jig-amber hover:text-jig-amber-dark">View All Products &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ══════════ MEMBERS GET MORE ══════════ */}
      <section className="py-16 sm:py-20 bg-jig-slate">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="rounded-[20px] p-10 sm:p-14" style={{ background: 'linear-gradient(160deg, #7C3AED 0%, #6D28D9 40%, #1E1E1E 100%)' }}>
            <h2 className="font-heading text-[2rem] sm:text-[2.5rem] text-white uppercase mb-4">Members Get More</h2>
            <p className="text-white/70 mb-8 max-w-lg mx-auto">
              Register for exclusive access to our full product range including medical cannabis (Section 21), member pricing, and loyalty rewards
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-wider rounded-xl hover:-translate-y-1 transition-all"
              style={{ background: 'linear-gradient(135deg, #E8C45A, #D97706, #B8922D)', color: '#1A1A1A', boxShadow: '0 15px 40px rgba(212,175,55,0.3)', border: '2px solid #D97706' }}
            >
              Become a Member
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ WHY CHOOSE US / QUALITY COUNTS ══════════ */}
      <section className="py-16 sm:py-24 bg-jig-slate">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="text-[0.75rem] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#B8922D' }}>Why Choose Us</div>
            <h2 className="font-heading text-[2.5rem] sm:text-[3.5rem] text-white uppercase">Quality Counts</h2>
            <p className="font-accent italic text-gray-500 mt-2">Your wellness journey, backed by expertise and compliance</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="bg-white rounded-[20px] p-8 text-center group transition-all duration-500 hover:-translate-y-3 hover:[transform:translateY(-10px)_rotateX(5deg)]"
                style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.08)', perspective: '1000px' }}
              >
                <div className="w-[70px] h-[70px] rounded-[20px] flex items-center justify-center mx-auto mb-5 text-[1.8rem] group-hover:scale-110 transition-transform" style={{ background: 'linear-gradient(145deg, #E8C45A, #D97706)', boxShadow: '0 10px 25px rgba(212,175,55,0.3)' }}>
                  {feat.emoji}
                </div>
                <h3 className="font-heading text-[1.1rem] uppercase text-white tracking-wide mb-2">{feat.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ LOCATIONS ══════════ */}
      <section id="locations" className="py-16 sm:py-24 bg-jig-slate" style={{ perspective: '1000px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="text-[0.75rem] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#B8922D' }}>Find Us</div>
            <h2 className="font-heading text-[2.5rem] sm:text-[3.5rem] text-white uppercase">Collection Points</h2>
            <p className="font-accent italic text-gray-500 mt-2">Visit us at our 8 locations across South Africa</p>
          </div>

          <div className="relative overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {/* Edge fade gradients — mobile only */}
            <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none sm:hidden" style={{ background: 'linear-gradient(to right, #0A0A0A, transparent)' }} />
            <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none sm:hidden" style={{ background: 'linear-gradient(to left, #0A0A0A, transparent)' }} />
            <div className="flex gap-6 sm:grid sm:grid-cols-4 sm:gap-6 min-w-max sm:min-w-0 pt-4">
              {LOCATIONS_PREVIEW.map((loc) => (
                <Link
                  key={loc.name}
                  to="/locations"
                  className={`group relative bg-white rounded-[24px] p-8 pt-10 text-center border transition-all duration-500 w-[260px] sm:w-auto shrink-0 sm:shrink hover:-translate-y-3 ${
                    loc.open
                      ? 'border-2 border-jig-amber cursor-pointer'
                      : 'border-gray-100 opacity-70 cursor-pointer'
                  }`}
                  style={{ transformStyle: 'preserve-3d', boxShadow: loc.open ? '0 0 20px rgba(212,175,55,0.3)' : '0 4px 15px rgba(0,0,0,0.05)' }}
                >
                  {/* Top gradient bar */}
                  <div className="absolute top-0 left-[10%] right-[10%] h-[5px] rounded-b-full bg-gradient-to-r from-jig-purple via-jig-amber to-jig-red scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

                  {/* Status badge */}
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider whitespace-nowrap ${loc.open ? 'text-white' : 'text-white'}`} style={{ background: loc.open ? '#D97706' : '#737373' }}>
                    {loc.open ? 'Now Open' : 'Coming Soon'}
                  </div>

                  {/* Location icon */}
                  <div className="w-[70px] h-[70px] rounded-full flex items-center justify-center mx-auto mb-5 text-[1.5rem] group-hover:scale-110 transition-transform" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 8px 20px rgba(58,95,72,0.3)', transform: 'translateZ(15px)' }}>
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 384 512"><path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z" /></svg>
                  </div>

                  <h3 className={`font-heading text-2xl uppercase mb-2 ${loc.open ? 'text-jig-amber' : 'text-jig-purple'}`}>{loc.name}</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">{loc.address}<br />{loc.province}</p>

                  {loc.hours && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-jig-slate rounded-full text-sm font-semibold text-gray-700 border border-gray-200">
                      <svg className="w-4 h-4 text-jig-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {loc.hours}
                    </div>
                  )}

                  {loc.open && (
                    <div className="mt-4">
                      <span className="inline-block px-5 py-2 bg-jig-purple text-white text-sm font-semibold rounded-lg">Shop Now</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div className="text-center mt-6">
            <Link to="/locations" className="inline-flex items-center gap-2 text-sm font-semibold text-jig-amber hover:text-jig-amber-dark transition-colors">View All Locations &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ══════════ BEGIN YOUR JOURNEY CTA ══════════ */}
      <section className="py-16 sm:py-24 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #7C3AED 0%, #6D28D9 40%, #1E1E1E 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: LEAF_PATTERN, backgroundSize: '100px 100px' }} />
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <h2 className="font-heading text-[2.5rem] sm:text-[4rem] text-white uppercase mb-3" style={{ textShadow: '0 4px 30px rgba(0,0,0,0.3)' }}>Begin Your Journey</h2>
          <p className="font-accent italic text-[1.1rem] sm:text-[1.35rem] mb-4" style={{ color: '#E8C45A' }}>"Quality Counts &middot; Finest Goods"</p>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            Join thousands of South Africans accessing legal medical cannabis. Register today.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-wider rounded-xl hover:-translate-y-1 transition-all"
            style={{ background: 'linear-gradient(135deg, #E8C45A, #D97706, #B8922D)', color: '#1A1A1A', boxShadow: '0 15px 40px rgba(212,175,55,0.3)' }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 512 512"><path d="M502.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l370.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128z" /></svg>
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  );
}
