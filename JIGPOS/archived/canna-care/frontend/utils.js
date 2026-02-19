// Utility functions and configuration - Max 200 lines

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Token management
export function getToken() {
    return localStorage.getItem('token');
}

export function setToken(token) {
    localStorage.setItem('token', token);
}

export function removeToken() {
    localStorage.removeItem('token');
}

// API call helper
export async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
        method,
        headers
    };
    
    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Request failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Validation helpers
export const validators = {
    email: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    password: (password) => {
        return password.length >= 8;
    },
    
    phone: (phone) => {
        const re = /^[\d\s\-\+\(\)]+$/;
        return re.test(phone);
    },
    
    postalCode: (code) => {
        return code.length >= 4;
    }
};

// Formatting helpers
export const formatters = {
    currency: (amount, currency = 'ZAR') => {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },
    
    date: (dateString) => {
        return new Date(dateString).toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    orderNumber: (number) => {
        return `#${number}`;
    }
};

// Cart helpers
export const cartHelpers = {
    getLocalCart: () => {
        const cart = localStorage.getItem('cart');
        return cart ? JSON.parse(cart) : [];
    },
    
    saveLocalCart: (cart) => {
        localStorage.setItem('cart', JSON.stringify(cart));
    },
    
    clearLocalCart: () => {
        localStorage.removeItem('cart');
    },
    
    calculateTotal: (items) => {
        return items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
};

// Error handling
export class AppError extends Error {
    constructor(message, code = 'GENERIC_ERROR') {
        super(message);
        this.code = code;
    }
}

export function handleApiError(error) {
    if (error.code === 'UNAUTHORIZED') {
        removeToken();
        window.location.href = '/login';
    } else if (error.code === 'FORBIDDEN') {
        alert('You do not have permission to perform this action');
    } else {
        console.error('API Error:', error);
    }
}

// Constants
export const CONSTANTS = {
    MAX_CART_ITEMS: 99,
    MIN_PASSWORD_LENGTH: 8,
    DEFAULT_CURRENCY: 'ZAR',
    SHIPPING_FREE_THRESHOLD: 500,
    SHIPPING_COST: 50,
    
    ORDER_STATUS: {
        PENDING: 'pending',
        PROCESSING: 'processing',
        SHIPPED: 'shipped',
        DELIVERED: 'delivered',
        CANCELLED: 'cancelled'
    },
    
    PAYMENT_METHODS: {
        EFT: 'eft',
        CRYPTO: 'crypto',
        CARD: 'card'
    }
};

// Debounce function for search
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Image helpers
export const imageHelpers = {
    getImageUrl: (path) => {
        if (!path) return '/images/placeholder.png';
        if (path.startsWith('http')) return path;
        return `${window.location.origin}${path}`;
    },
    
    preloadImage: (src) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = reject;
            img.src = src;
        });
    }
};

// Analytics helpers (placeholder)
export const analytics = {
    trackEvent: (category, action, label = null, value = null) => {
        console.log('Analytics event:', { category, action, label, value });
        // Integrate with analytics service
    },
    
    trackPageView: (page) => {
        console.log('Page view:', page);
        // Integrate with analytics service
    }
};

// WhatsApp integration
export function sendWhatsAppOrder(order, clientInfo) {
    let orderDetails = `LOOSE DRAW ORDER:\n\n`;
    order.items.forEach(item => {
        orderDetails += `${item.name} x ${item.quantity} = R${item.price * item.quantity}\n`;
    });
    orderDetails += `\nTotal: R${order.total}\n\n`;
    orderDetails += `Client Details\nName: ${clientInfo.name}\nEmail: ${clientInfo.email}\nPhone: ${clientInfo.phone}\nAddress: ${clientInfo.address}`;
    
    const whatsappMessage = encodeURIComponent(orderDetails);
    const phoneNumber = '27794068239';
    window.open(`https://wa.me/${phoneNumber}?text=${whatsappMessage}`, '_blank');
}

// Export all utilities
export default {
    apiCall,
    getToken,
    setToken,
    removeToken,
    validators,
    formatters,
    cartHelpers,
    AppError,
    handleApiError,
    CONSTANTS,
    debounce,
    imageHelpers,
    analytics,
    sendWhatsAppOrder
};