import React, { useState, useContext, createContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthComponents from './auth.jsx';
import ProductComponents from './products.jsx';
import ShopComponents from './shop.jsx';
import { apiCall, getToken, setToken, removeToken } from './utils.js';

// Auth Context
const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getToken();
        if (token) {
            apiCall('/auth/profile').then(data => {
                setUser(data);
            }).catch(() => {
                removeToken();
            }).finally(() => {
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const data = await apiCall('/auth/login', 'POST', { email, password });
        setToken(data.token);
        setUser(data.user);
        return data;
    };

    const register = async (userData) => {
        const data = await apiCall('/auth/register', 'POST', userData);
        setToken(data.token);
        setUser(data.user);
        return data;
    };

    const logout = async () => {
        await apiCall('/auth/logout', 'POST');
        removeToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

// Navigation Component
function Navigation() {
    const { user, logout } = useAuth();
    const [isScrolled, setIsScrolled] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 100);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`nav ${isScrolled ? 'scrolled' : ''}`}>
            <div className="nav-content">
                <div className="nav-logo">LOOSE DRAW</div>
                <div className="nav-links">
                    <a href="#home">Home</a>
                    <a href="#products">Shop</a>
                    {user?.isLifestyleMember && <a href="#lifestyle">Lifestyle</a>}
                    <a href="#contact">Contact</a>
                    {user ? (
                        <>
                            <a href="#profile">Profile</a>
                            <button onClick={logout} className="nav-btn">Logout</button>
                        </>
                    ) : (
                        <a href="#login">Login</a>
                    )}
                </div>
                <div className="cart-icon" onClick={() => setCartOpen(true)}>
                    🛒
                    <span className="cart-count">0</span>
                </div>
            </div>
        </nav>
    );
}

// Hero Section
function HeroSection() {
    return (
        <section className="hero" id="home">
            <div className="hero-content">
                <div className="logo">
                    <img src="/images/logo.png" alt="Loose Draw Logo" />
                </div>
                <h1>GAS STATION</h1>
                <p>Loose Draw. Live the lifestyle.</p>
                <button className="cta-button" onClick={() => document.getElementById('products').scrollIntoView()}>
                    LIFESTYLE SHOP
                </button>
            </div>
        </section>
    );
}

// Protected Route Component
function ProtectedRoute({ children, requireLifestyle = false }) {
    const { user, loading } = useAuth();
    
    if (loading) return <div className="loading">Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    if (requireLifestyle && !user.isLifestyleMember) {
        return <div className="lifestyle-required">Lifestyle membership required</div>;
    }
    
    return children;
}

// Main App Component
export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <div className="app">
                    <Navigation />
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/login" element={<AuthComponents.Login />} />
                        <Route path="/register" element={<AuthComponents.Register />} />
                        <Route path="/profile" element={
                            <ProtectedRoute>
                                <AuthComponents.Profile />
                            </ProtectedRoute>
                        } />
                        <Route path="/merchandise" element={<ProductComponents.Merchandise />} />
                        <Route path="/lifestyle" element={
                            <ProtectedRoute requireLifestyle>
                                <ProductComponents.Lifestyle />
                            </ProtectedRoute>
                        } />
                        <Route path="/cart" element={<ShopComponents.Cart />} />
                        <Route path="/checkout" element={
                            <ProtectedRoute>
                                <ShopComponents.Checkout />
                            </ProtectedRoute>
                        } />
                        <Route path="/orders" element={
                            <ProtectedRoute>
                                <ShopComponents.OrderHistory />
                            </ProtectedRoute>
                        } />
                    </Routes>
                </div>
            </AuthProvider>
        </BrowserRouter>
    );
}

// Home Page Component
function HomePage() {
    const { user } = useAuth();
    
    return (
        <>
            <HeroSection />
            <section className="lifestyle-section">
                <div className="container">
                    <div className="lifestyle-content">
                        <h2 className="section-title">Live the Lifestyle</h2>
                        <div className="lifestyle-text">
                            Loose Draw stands as a statement brand: bold, unapologetic, and designed for those who choose to live life on their own terms.
                        </div>
                        <div className="features">
                            <div className="feature">
                                <div className="feature-icon">🔥</div>
                                <h3>Premium Quality</h3>
                                <p>Crafted with precision and care</p>
                            </div>
                            <div className="feature">
                                <div className="feature-icon">🌍</div>
                                <h3>Street Authentic</h3>
                                <p>Real South African heritage</p>
                            </div>
                            <div className="feature">
                                <div className="feature-icon">👕</div>
                                <h3>Full Lifestyle</h3>
                                <p>Fashion, culture, and community</p>
                            </div>
                        </div>
                        {!user && (
                            <div className="cta-section">
                                <p>Join the lifestyle movement</p>
                                <a href="/register" className="cta-button">Become a Member</a>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            <ProductComponents.Merchandise featured />
        </>
    );
}