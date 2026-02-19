// P36 — Sticky nav matching vanilla: logo crest, How It Works/Menu/Locations/About, Login/Register buttons
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

const NAV_LINKS = [
  { label: 'How It Works', to: '/home', hash: '#how-it-works' },
  { label: 'Menu', to: '/products' },
  { label: 'Locations', to: '/locations' },
  { label: 'About', to: '/about' },
];

export default function StorefrontNav({ onCartOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const location = useLocation();

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function handleNavClick(link) {
    if (link.hash && location.pathname === '/home') {
      const el = document.querySelector(link.hash);
      if (el) { el.scrollIntoView({ behavior: 'smooth' }); return; }
    }
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[1000] transition-all duration-300"
      style={
        scrolled
          ? { background: 'rgba(244,240,230,0.95)', backdropFilter: 'blur(12px)', borderBottom: '2px solid #D97706', boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }
          : { background: 'transparent' }
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo with crest */}
          <Link to="/home" className="flex items-center gap-3 shrink-0">
            <img
              src="/app/images/jig-logo-nobg.png"
              alt="JIG Craft Cannabis"
              className="w-12 h-12 object-contain"
            />
            <div className="hidden sm:block">
              <div className={`font-heading text-[1.4rem] uppercase leading-none transition-colors ${scrolled ? 'text-white' : 'text-white'}`}>
                JIG Craft Cannabis
              </div>
              <div className={`font-accent text-[0.55rem] tracking-wider transition-colors ${scrolled ? 'text-jig-purple-light' : 'text-white/60'}`}>
                Quality Counts
              </div>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.label}
                  to={link.hash ? `${link.to}${link.hash}` : link.to}
                  onClick={() => handleNavClick(link)}
                  className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider rounded-lg transition-all duration-200 ${
                    active
                      ? scrolled ? 'text-jig-amber' : 'text-jig-amber'
                      : scrolled ? 'text-jig-purple-dark hover:text-jig-amber' : 'text-white/90 hover:text-jig-amber'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Cart icon */}
            <button
              onClick={onCartOpen}
              className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-colors ${scrolled ? 'text-jig-purple-dark hover:text-jig-amber' : 'text-white hover:text-jig-amber'}`}
              aria-label="Open cart"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 576 512">
                <path d="M0 24C0 10.7 10.7 0 24 0L69.5 0c22 0 41.5 12.8 50.6 32l411 0c26.3 0 45.5 25 38.6 50.4l-41 152.3c-8.5 31.4-37 53.3-69.5 53.3l-288.5 0 5.4 28.5c2.2 11.3 12.1 19.5 23.6 19.5L488 336c13.3 0 24 10.7 24 24s-10.7 24-24 24l-288.3 0c-34.6 0-64.3-24.6-70.7-58.5L77.4 54.5c-.7-3.8-4-6.5-7.9-6.5L24 48C10.7 48 0 37.3 0 24zM128 464a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm336-48a48 48 0 1 1 0 96 48 48 0 1 1 0-96z" />
              </svg>
              {itemCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center"
                  style={{ background: '#D97706', color: '#1E1E1E' }}
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            {/* Auth buttons */}
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/my-account"
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${
                    scrolled ? 'border-jig-purple text-jig-purple-dark hover:bg-jig-purple hover:text-white' : 'border-white/40 text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512"><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z" /></svg>
                  Account
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm font-semibold text-jig-red hover:text-jig-red-dark transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/login"
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${
                    scrolled ? 'border-jig-purple text-jig-purple-dark hover:bg-jig-purple hover:text-white' : 'border-white/40 text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512"><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z" /></svg>
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white rounded-lg hover:-translate-y-0.5 transition-all"
                  style={{ background: '#DC2626', boxShadow: '0 4px 12px rgba(166,52,41,0.3)' }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 640 512"><path d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304l91.4 0C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7L29.7 512C13.3 512 0 498.7 0 482.3zM504 312l0-64-64 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l64 0 0-64c0-13.3 10.7-24 24-24s24 10.7 24 24l0 64 64 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-64 0 0 64c0 13.3-10.7 24-24 24s-24-10.7-24-24z" /></svg>
                  Register
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-jig-purple-dark' : 'text-white'}`}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-jig-slate/98 backdrop-blur-md border-t border-gray-200">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.label}
                  to={link.hash ? `${link.to}${link.hash}` : link.to}
                  className={`block px-4 py-3 text-sm font-semibold uppercase tracking-wider rounded-lg ${
                    active ? 'text-jig-amber bg-jig-slate/5' : 'text-jig-purple-dark'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-gray-200 mt-2">
              {isAuthenticated ? (
                <>
                  <Link to="/my-account" className="block px-4 py-3 text-sm font-semibold text-jig-purple-dark">My Account</Link>
                  <button onClick={logout} className="block w-full text-left px-4 py-3 text-sm font-semibold text-jig-red">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block px-4 py-3 text-sm font-semibold text-jig-purple-dark">Login</Link>
                  <Link to="/register" className="block px-4 py-3 text-sm font-semibold" style={{ color: '#DC2626' }}>Register</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
