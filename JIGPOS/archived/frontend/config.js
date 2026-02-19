/**
 * DBC_CONFIG — Single source of truth for app configuration
 * Include this BEFORE any other DBC scripts in HTML files:
 *   <script src="/frontend/config.js"></script>
 */
const DBC_CONFIG = {
    API_URL: (function() {
        const h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1') {
            return 'http://localhost:3002/api/v1';
        }
        return `${window.location.protocol}//${window.location.host}/api/v1`;
    })(),

    DEV_MODE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',

    BRAND: {
        cream: '#F4F0E6',
        green: '#3A5F48',
        darkGreen: '#2A4635',
        gold: '#D4AF37',
        red: '#A63429',
        darkRed: '#8A2722',
        navy: '#1E3328'
    },

    CURRENCY: {
        locale: 'en-ZA',
        symbol: 'R'
    }
};

// Backward-compatible: expose as global so existing `API_URL` references work
// after removing local declarations. Files can use either DBC_CONFIG.API_URL or API_URL.
var API_URL = DBC_CONFIG.API_URL;
var DEV_MODE = DBC_CONFIG.DEV_MODE;
