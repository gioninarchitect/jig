// P36 — Storefront layout: Nav + Footer + AgeGate + CartDrawer
import { useState } from 'react';
import StorefrontNav from '../components/storefront/StorefrontNav';
import StorefrontFooter from '../components/storefront/StorefrontFooter';
import CartDrawer from '../components/storefront/CartDrawer';
import AgeGateModal from '../components/storefront/AgeGateModal';

export default function StorefrontLayout({ children }) {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-jig-slate font-body">
      <AgeGateModal />
      <StorefrontNav onCartOpen={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      {/* Main content — offset for fixed nav */}
      <main className="pt-16 sm:pt-20">
        {children}
      </main>
      <StorefrontFooter />
    </div>
  );
}
