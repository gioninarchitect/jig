/**
 * Origin_CONFIG — Single source of truth for app configuration
 * Include this BEFORE any other Origin scripts in HTML files:
 *   <script src="/frontend/config.js"></script>
 */
const Origin_CONFIG = {
    API_URL: (function() {
        const h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1') {
            // Development: API on same Express server
            return `${window.location.protocol}//${window.location.host}/api/v1`;
        }
        // Production: POS API behind /pos/api/ nginx prefix
        return `${window.location.protocol}//${window.location.host}/pos/api/v1`;
    })(),

    DEV_MODE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',

    BRAND: {
        black: '#0A0A0A',
        gold: '#C9A84C',
        goldMuted: '#8B6914',
        goldBright: '#D4B86A',
        goldLight: '#E8D5A3',
        dark: '#141414',
        white: '#F5F0E8',
        red: '#DC2626'
    },

    CURRENCY: {
        locale: 'en-ZA',
        symbol: 'R'
    },

    VAT_RATE: 0.15  // 15% — change here to update everywhere
};

// Backward-compatible aliases
var API_URL = Origin_CONFIG.API_URL;
var DEV_MODE = Origin_CONFIG.DEV_MODE;
var VAT_RATE = Origin_CONFIG.VAT_RATE;
