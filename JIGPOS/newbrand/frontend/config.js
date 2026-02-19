/**
 * JIG_CONFIG — Single source of truth for app configuration
 * Include this BEFORE any other JIG scripts in HTML files:
 *   <script src="/frontend/config.js"></script>
 */
const JIG_CONFIG = {
    API_URL: (function() {
        const h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1') {
            return 'http://localhost:3002/api/v1';
        }
        return `${window.location.protocol}//${window.location.host}/api/v1`;
    })(),

    DEV_MODE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',

    BRAND: {
        black: '#0A0A0A',
        purple: '#7C3AED',
        purpleDark: '#6D28D9',
        amber: '#D97706',
        green: '#15803D',
        slate: '#1E1E1E',
        white: '#FAFAFA',
        red: '#DC2626'
    },

    CURRENCY: {
        locale: 'en-ZA',
        symbol: 'R'
    }
};

// Backward-compatible aliases
const JIG_CONFIG = JIG_CONFIG;
var API_URL = JIG_CONFIG.API_URL;
var DEV_MODE = JIG_CONFIG.DEV_MODE;
