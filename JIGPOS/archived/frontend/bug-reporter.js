/**
 * Basotho Medical Herbs UAT Bug Reporter
 * Enhanced bug tracking with screenshot capture, console errors, and full context
 * Adapted from ZayaHealth system
 */

// Prevent duplicate initialization
if (typeof CBDBugReporter !== 'undefined') {
    console.warn('CBDBugReporter already loaded, skipping...');
} else {

class CBDBugReporter {
    constructor() {
        this.consoleErrors = [];
        this.networkLogs = [];
        this.screenshot = null;
        this.fullPageCanvas = null;
        this.isVisible = false;
        this.brandColor = '#000000'; // Black
        this.selectionMode = false;
        this.selectionArea = null;

        this.init();
        this.setupErrorCapture();
        this.setupNetworkCapture();
    }

    init() {
        this.loadHtml2Canvas();
        this.createStyles();
        this.createFloatingButton();
        this.createModal();
        this.attachEventListeners();
    }

    loadHtml2Canvas() {
        // Load html2canvas library if not already loaded
        if (typeof html2canvas === 'undefined') {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load html2canvas'));
                document.head.appendChild(script);
            });
        }
        return Promise.resolve();
    }

    createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .cbd-bug-btn {
                position: fixed;
                bottom: 90px;
                right: 20px;
                width: 56px;
                height: 56px;
                background: #000000;
                border: none;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                cursor: pointer;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                transition: all 0.3s ease;
                color: white;
                padding: 12px;
            }

            .cbd-bug-btn img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                filter: brightness(0) invert(1);
            }

            .cbd-bug-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(0,0,0,0.6);
                background: #333333;
            }

            /* Screenshot selection overlay */
            .cbd-bug-selection-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 999999;
                cursor: crosshair;
                background: rgba(0, 0, 0, 0.3);
            }

            .cbd-bug-selection-box {
                position: absolute;
                border: 2px dashed #ffffff;
                background: rgba(255, 255, 255, 0.1);
                pointer-events: none;
            }

            .cbd-bug-selection-instructions {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #000000;
                color: white;
                padding: 15px 30px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                z-index: 1000000;
                border: 1px solid #444444;
            }

            .cbd-bug-btn-select-area {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background: #000000;
                color: white;
                border: 1px solid #444444;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s;
                margin: 10px 0;
            }

            .cbd-bug-btn-select-area:hover {
                background: #333333;
                border-color: #666666;
            }

            .cbd-bug-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 100000;
                padding: 20px;
                box-sizing: border-box;
                overflow-y: auto;
            }

            .cbd-bug-modal.visible {
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .cbd-bug-content {
                background: #1a1a1a;
                border-radius: 12px;
                width: 100%;
                max-width: 700px;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.1);
            }

            .cbd-bug-header {
                background: ${this.brandColor};
                color: white;
                padding: 20px;
                border-radius: 12px 12px 0 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .cbd-bug-header h3 {
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .cbd-bug-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
            }

            .cbd-bug-close:hover {
                background: rgba(255,255,255,0.1);
            }

            .cbd-bug-body {
                padding: 20px;
            }

            .cbd-bug-metadata {
                background: #0a0a0a;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                font-size: 12px;
                border: 1px solid #333333;
            }

            .cbd-bug-metadata h4 {
                margin: 0 0 10px 0;
                color: #ffffff;
                font-size: 14px;
            }

            .cbd-bug-metadata-item {
                margin-bottom: 5px;
                color: #888888;
            }

            .cbd-bug-metadata-item strong {
                color: #ffffff;
            }

            .cbd-bug-screenshot {
                max-width: 100%;
                border-radius: 8px;
                margin: 10px 0;
                border: 2px solid #444444;
            }

            .cbd-bug-error {
                background: #1a0a0a;
                border: 1px solid #4a2020;
                border-radius: 4px;
                padding: 8px;
                margin: 4px 0;
                font-family: monospace;
                font-size: 11px;
                color: #ff6b6b;
            }

            .cbd-bug-form-group {
                margin-bottom: 20px;
            }

            .cbd-bug-form-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: #ffffff;
            }

            .cbd-bug-form-group input,
            .cbd-bug-form-group select,
            .cbd-bug-form-group textarea {
                width: 100%;
                padding: 12px;
                border: 1px solid #444444;
                border-radius: 8px;
                font-size: 14px;
                font-family: inherit;
                box-sizing: border-box;
                transition: border-color 0.2s ease;
                background: #1a1a1a;
                color: #ffffff;
            }

            .cbd-bug-form-group input:focus,
            .cbd-bug-form-group select:focus,
            .cbd-bug-form-group textarea:focus {
                outline: none;
                border-color: ${this.brandColor};
            }

            .cbd-bug-form-group textarea {
                min-height: 100px;
                resize: vertical;
            }

            .cbd-bug-required {
                color: #e74c3c;
            }

            .cbd-bug-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                margin-top: 24px;
                padding-top: 20px;
                border-top: 1px solid #444444;
            }

            .cbd-bug-btn-action {
                padding: 12px 24px;
                border: 1px solid #444444;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .cbd-bug-btn-primary {
                background: #000000;
                color: white;
            }

            .cbd-bug-btn-primary:hover {
                background: #333333;
                border-color: #666666;
            }

            .cbd-bug-btn-secondary {
                background: #1a1a1a;
                color: #ffffff;
            }

            .cbd-bug-btn-secondary:hover {
                background: #2a2a2a;
                border-color: #666666;
            }

            .cbd-bug-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 16px 24px;
                border-radius: 8px;
                color: white;
                z-index: 100001;
                transform: translateX(400px);
                transition: transform 0.3s ease;
                max-width: 350px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }

            .cbd-bug-notification.visible {
                transform: translateX(0);
            }

            .cbd-bug-notification.success {
                background: #000000;
                border: 1px solid #34D399;
            }

            .cbd-bug-notification.error {
                background: #e74c3c;
            }

            .cbd-bug-loading {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 3px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: white;
                animation: spin 1s ease-in-out infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            @media (max-width: 768px) {
                .cbd-bug-modal {
                    padding: 10px;
                }

                .cbd-bug-content {
                    max-height: 95vh;
                }

                .cbd-bug-header,
                .cbd-bug-body {
                    padding: 16px;
                }

                .cbd-bug-btn {
                    width: 50px;
                    height: 50px;
                    font-size: 20px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    createFloatingButton() {
        const button = document.createElement('button');
        button.className = 'cbd-bug-btn';
        button.innerHTML = '<img src="/images/bug-icon.png" alt="Report Bug" />';
        button.title = 'Report Bug (UAT)';
        button.onclick = () => this.showModal();
        document.body.appendChild(button);
        this.button = button;
    }

    createModal() {
        const modal = document.createElement('div');
        modal.className = 'cbd-bug-modal';
        modal.innerHTML = `
            <div class="cbd-bug-content">
                <div class="cbd-bug-header">
                    <h3><img src="/images/bug-icon.png" style="width:24px;height:24px;filter:brightness(0) invert(1);" /> Report Bug - UAT</h3>
                    <button class="cbd-bug-close" onclick="window.cbdBugReporter.hideModal()">&times;</button>
                </div>
                <div class="cbd-bug-body">
                    <div class="cbd-bug-metadata">
                        <h4>Captured Metadata</h4>
                        <button type="button" class="cbd-bug-btn-select-area" onclick="window.cbdBugReporter.startAreaSelection()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
                            </svg>
                            Select Screenshot Area
                        </button>
                        <div id="cbd-bug-metadata-content">Loading...</div>
                    </div>

                    <form id="cbd-bug-form">
                        <div class="cbd-bug-form-group">
                            <label for="cbd-bug-type">Issue Type <span class="cbd-bug-required">*</span></label>
                            <select id="cbd-bug-type" required>
                                <option value="">Select issue type...</option>
                                <option value="bug">Bug</option>
                                <option value="ui">UI Issue</option>
                                <option value="data">Data Issue</option>
                                <option value="performance">Performance</option>
                                <option value="feature">Feature Request</option>
                            </select>
                        </div>

                        <div class="cbd-bug-form-group">
                            <label for="cbd-bug-priority">Priority <span class="cbd-bug-required">*</span></label>
                            <select id="cbd-bug-priority" required>
                                <option value="">Select priority...</option>
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>

                        <div class="cbd-bug-form-group">
                            <label for="cbd-bug-description">Description <span class="cbd-bug-required">*</span></label>
                            <textarea id="cbd-bug-description" placeholder="What happened? What did you expect?" required></textarea>
                        </div>

                        <div class="cbd-bug-form-group">
                            <label for="cbd-bug-steps">Steps to Reproduce</label>
                            <textarea id="cbd-bug-steps" placeholder="1. Go to...\n2. Click on...\n3. See error..."></textarea>
                        </div>

                        <div class="cbd-bug-actions">
                            <button type="button" class="cbd-bug-btn-action cbd-bug-btn-secondary" onclick="window.cbdBugReporter.hideModal()">Cancel</button>
                            <button type="submit" class="cbd-bug-btn-action cbd-bug-btn-primary">
                                <span class="submit-text">Submit Bug Report</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;

        // Setup form submission
        const form = modal.querySelector('#cbd-bug-form');
        form.onsubmit = (e) => this.submitBugReport(e);

        // Setup click outside to close
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.hideModal();
            }
        };
    }

    setupErrorCapture() {
        window.addEventListener('error', (event) => {
            this.consoleErrors.push({
                type: 'error',
                message: event.message,
                file: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error ? event.error.stack : null,
                timestamp: new Date().toISOString()
            });
            if (this.consoleErrors.length > 10) this.consoleErrors.shift();
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.consoleErrors.push({
                type: 'unhandledrejection',
                message: `Unhandled Promise: ${event.reason}`,
                stack: event.reason && event.reason.stack ? event.reason.stack : null,
                timestamp: new Date().toISOString()
            });
            if (this.consoleErrors.length > 10) this.consoleErrors.shift();
        });

        const originalError = console.error;
        console.error = (...args) => {
            this.consoleErrors.push({
                type: 'console.error',
                message: args.join(' '),
                timestamp: new Date().toISOString(),
                stack: new Error().stack
            });
            if (this.consoleErrors.length > 10) this.consoleErrors.shift();
            originalError.apply(console, args);
        };
    }

    setupNetworkCapture() {
        const originalFetch = window.fetch;
        const self = this;
        window.fetch = function(...args) {
            const startTime = Date.now();
            return originalFetch.apply(window, args)
                .then(response => {
                    self.networkLogs.push({
                        type: 'fetch',
                        url: typeof args[0] === 'string' ? args[0] : args[0].url,
                        method: args[1]?.method || 'GET',
                        status: response.status,
                        duration: Date.now() - startTime,
                        timestamp: new Date().toISOString()
                    });
                    if (self.networkLogs.length > 20) self.networkLogs.shift();
                    return response;
                })
                .catch(error => {
                    self.networkLogs.push({
                        type: 'fetch',
                        url: typeof args[0] === 'string' ? args[0] : args[0].url,
                        method: args[1]?.method || 'GET',
                        status: 'failed',
                        error: error.message,
                        duration: Date.now() - startTime,
                        timestamp: new Date().toISOString()
                    });
                    if (self.networkLogs.length > 20) self.networkLogs.shift();
                    throw error;
                });
        };
    }

    async captureFullPageScreenshot() {
        // Capture full page and store canvas for cropping later
        try {
            if (typeof html2canvas === 'function') {
                this.fullPageCanvas = await html2canvas(document.documentElement, {
                    scale: 0.5,
                    logging: false,
                    useCORS: true,
                    allowTaint: true,
                    windowWidth: document.documentElement.scrollWidth,
                    windowHeight: document.documentElement.scrollHeight
                });
                this.screenshot = this.fullPageCanvas.toDataURL('image/jpeg', 0.6);
            }
        } catch (error) {
            console.warn('Full page screenshot capture failed:', error);
            this.fullPageCanvas = null;
            this.screenshot = null;
        }
    }

    async captureScreenshot(area = null) {
        try {
            if (typeof html2canvas === 'function') {
                // If area selected and we have a full page canvas, crop it
                if (area && this.fullPageCanvas) {
                    const croppedCanvas = document.createElement('canvas');
                    const ctx = croppedCanvas.getContext('2d');
                    const scale = 0.5; // Match html2canvas scale

                    croppedCanvas.width = area.width * scale;
                    croppedCanvas.height = area.height * scale;

                    ctx.drawImage(
                        this.fullPageCanvas,
                        area.x * scale, area.y * scale,
                        area.width * scale, area.height * scale,
                        0, 0,
                        area.width * scale, area.height * scale
                    );

                    this.screenshot = croppedCanvas.toDataURL('image/jpeg', 0.7);
                } else if (!area) {
                    // No area specified, capture full page
                    const canvas = await html2canvas(document.documentElement, {
                        scale: 0.5,
                        logging: false,
                        useCORS: true,
                        allowTaint: true,
                        windowWidth: document.documentElement.scrollWidth,
                        windowHeight: document.documentElement.scrollHeight
                    });
                    this.screenshot = canvas.toDataURL('image/jpeg', 0.6);
                }
            } else {
                this.screenshot = 'html2canvas library not loaded yet';
            }
        } catch (error) {
            console.warn('Screenshot capture failed:', error);
            this.screenshot = null;
        }
    }

    async startAreaSelection() {
        this.selectionMode = true;

        // First, hide modal and capture full screenshot
        this.hideModal();

        // Show capturing message
        const capturingMsg = document.createElement('div');
        capturingMsg.className = 'cbd-bug-selection-instructions';
        capturingMsg.textContent = 'Capturing page... please wait';
        capturingMsg.style.zIndex = '999998';
        document.body.appendChild(capturingMsg);

        // Wait a moment for modal to fully hide, then capture
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            await this.loadHtml2Canvas();
            // Capture full page screenshot first
            await this.captureFullPageScreenshot();
        } catch (error) {
            console.error('Failed to capture page:', error);
            capturingMsg.remove();
            this.showModal();
            return;
        }

        capturingMsg.remove();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'cbd-bug-selection-overlay';
        overlay.id = 'cbd-bug-selection-overlay';

        // Create instructions
        const instructions = document.createElement('div');
        instructions.className = 'cbd-bug-selection-instructions';
        instructions.textContent = 'Drag to select area • ESC to cancel';
        overlay.appendChild(instructions);

        // Create selection box
        const selectionBox = document.createElement('div');
        selectionBox.className = 'cbd-bug-selection-box';
        selectionBox.style.display = 'none';
        overlay.appendChild(selectionBox);

        document.body.appendChild(overlay);

        let startX, startY, isDrawing = false;

        const updateSelection = (e) => {
            if (!isDrawing) return;

            const currentX = e.clientX;
            const currentY = e.clientY;

            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);

            selectionBox.style.left = left + 'px';
            selectionBox.style.top = top + 'px';
            selectionBox.style.width = width + 'px';
            selectionBox.style.height = height + 'px';
            selectionBox.style.display = 'block';
        };

        overlay.addEventListener('mousedown', (e) => {
            if (e.target !== overlay && e.target !== selectionBox) return;
            startX = e.clientX;
            startY = e.clientY;
            isDrawing = true;
        });

        overlay.addEventListener('mousemove', updateSelection);

        overlay.addEventListener('mouseup', async (e) => {
            if (!isDrawing) return;
            isDrawing = false;

            const currentX = e.clientX;
            const currentY = e.clientY;

            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);

            if (width > 10 && height > 10) {
                this.selectionArea = { x: left, y: top, width, height };

                // Remove overlay
                overlay.remove();

                // Show modal and capture with selection
                await this.showModalWithSelection();
            } else {
                selectionBox.style.display = 'none';
            }
        });

        // ESC to cancel
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
                this.showModal();
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    async showModalWithSelection() {
        this.modal.classList.add('visible');
        const metadataContent = this.modal.querySelector('#cbd-bug-metadata-content');
        metadataContent.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="cbd-bug-loading"></div> Cropping selected area...</div>';

        try {
            // Crop the already-captured full page screenshot
            await this.captureScreenshot(this.selectionArea);
        } catch (error) {
            console.error('Error cropping selection:', error);
        }

        const metadata = this.collectMetadata();
        this.updateMetadataPreview(metadata);
        this.isVisible = true;

        // Clear the full page canvas to free memory
        this.fullPageCanvas = null;
    }

    async showModal() {
        // Show loading state
        this.modal.classList.add('visible');
        const metadataContent = this.modal.querySelector('#cbd-bug-metadata-content');
        metadataContent.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="cbd-bug-loading"></div> Capturing screenshot...</div>';

        // Ensure html2canvas is loaded before capturing
        try {
            await this.loadHtml2Canvas();
            // Capture screenshot (async)
            await this.captureScreenshot();
        } catch (error) {
            console.error('Error loading html2canvas or capturing screenshot:', error);
        }

        // Collect and display metadata
        const metadata = this.collectMetadata();
        this.updateMetadataPreview(metadata);

        this.isVisible = true;

        // Focus first form element
        setTimeout(() => {
            const firstInput = this.modal.querySelector('select, input, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    hideModal() {
        this.modal.classList.remove('visible');
        this.isVisible = false;
        this.modal.querySelector('#cbd-bug-form').reset();
        this.screenshot = null;
    }

    collectMetadata() {
        return {
            timestamp: new Date().toISOString(),
            page: {
                url: window.location.href,
                pathname: window.location.pathname,
                hash: window.location.hash,
                title: document.title,
                component: this.detectComponent(),
                section: this.detectActiveSection()
            },
            browser: this.getBrowserInfo(),
            device: {
                type: /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
                isMobile: /mobile|android|iphone|ipad/i.test(navigator.userAgent),
                platform: navigator.platform
            },
            screen: {
                width: window.innerWidth,
                height: window.innerHeight,
                screenSize: `${window.innerWidth}x${window.innerHeight}`
            },
            user: this.getCurrentUser(),
            consoleErrors: this.consoleErrors.slice(-5),
            networkLogs: this.networkLogs.slice(-10),
            screenshot: this.screenshot
        };
    }

    detectComponent() {
        const path = window.location.pathname;

        // Basotho Medical Herbs pages
        if (path.includes('dashboard')) return 'Customer Dashboard';
        if (path.includes('admin')) return 'Admin Dashboard';
        if (path.includes('products')) return 'Products Catalog';
        if (path.includes('cart')) return 'Shopping Cart';
        if (path.includes('order')) return 'Checkout/Order';
        if (path.includes('login')) return 'Login Page';

        return document.title || 'Unknown Component';
    }

    detectActiveSection() {
        const hash = window.location.hash;
        if (hash) {
            return hash.replace('#', '').split('?')[0];
        }

        const activeNav = document.querySelector('.sidebar .menu-item.active, .nav-item.active, .list-group-item.active');
        if (activeNav) {
            return activeNav.textContent.trim();
        }

        return null;
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';

        if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Edg')) browser = 'Edge';
        else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

        const match = ua.match(/(Chrome|Safari|Firefox|Edg|Opera|OPR)\/(\d+)/);
        const version = match ? match[2] : '';

        return `${browser} ${version}`;
    }

    getCurrentUser() {
        try {
            let user = null;

            if (localStorage.getItem('user')) {
                user = JSON.parse(localStorage.getItem('user'));
            } else if (sessionStorage.getItem('user')) {
                user = JSON.parse(sessionStorage.getItem('user'));
            } else if (window.currentUser) {
                user = window.currentUser;
            }

            if (user) {
                return {
                    email: user.email || user.userEmail || 'Unknown',
                    role: user.role || user.userRole || 'user'
                };
            }

            return { email: 'UAT Tester', role: 'tester' };
        } catch {
            return { email: 'UAT Tester', role: 'tester' };
        }
    }

    updateMetadataPreview(metadata) {
        const content = this.modal.querySelector('#cbd-bug-metadata-content');

        let html = `
            <div class="cbd-bug-metadata-item"><strong>Page:</strong> ${metadata.page.title}</div>
            <div class="cbd-bug-metadata-item"><strong>Component:</strong> ${metadata.page.component}</div>
            <div class="cbd-bug-metadata-item"><strong>Section:</strong> ${metadata.page.section || 'N/A'}</div>
            <div class="cbd-bug-metadata-item"><strong>Browser:</strong> ${metadata.browser}</div>
            <div class="cbd-bug-metadata-item"><strong>Device:</strong> ${metadata.device.type} (${metadata.screen.screenSize})</div>
            <div class="cbd-bug-metadata-item"><strong>User:</strong> ${metadata.user.email} (${metadata.user.role})</div>
        `;

        if (metadata.screenshot && !metadata.screenshot.includes('not loaded')) {
            html += `
                <div class="cbd-bug-metadata-item" style="margin-top: 10px;"><strong>Screenshot:</strong></div>
                <img src="${metadata.screenshot}" class="cbd-bug-screenshot" alt="Page Screenshot" />
            `;
        }

        if (metadata.consoleErrors.length > 0) {
            html += `<div class="cbd-bug-metadata-item" style="margin-top: 10px;"><strong>Console Errors (${metadata.consoleErrors.length}):</strong></div>`;
            metadata.consoleErrors.forEach(error => {
                html += `<div class="cbd-bug-error">${error.type}: ${error.message}</div>`;
            });
        }

        content.innerHTML = html;
    }

    async submitBugReport(event) {
        event.preventDefault();

        const submitBtn = event.target.querySelector('.cbd-bug-btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="cbd-bug-loading"></div>';
        submitBtn.disabled = true;

        const bugReport = {
            id: Date.now(),
            type: document.getElementById('cbd-bug-type').value,
            priority: document.getElementById('cbd-bug-priority').value,
            description: document.getElementById('cbd-bug-description').value,
            steps: document.getElementById('cbd-bug-steps').value,
            status: 'new',
            ...this.collectMetadata(),
            timestamp: new Date().toISOString()
        };

        try {
            const response = await fetch('/api/v1/bug-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bugReport)
            });

            if (response.ok) {
                this.showNotification('Bug report submitted! Thank you for helping improve Basotho Medical Herbs!', 'success');
                this.hideModal();
            } else {
                throw new Error('Failed to submit bug report');
            }
        } catch (error) {
            console.error('Error submitting bug report:', error);
            this.showNotification('Failed to submit bug report. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    showNotification(message, type = 'success') {
        const existing = document.querySelector('.cbd-bug-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `cbd-bug-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('visible'), 100);

        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    attachEventListeners() {
        // Keyboard shortcut (Ctrl+Shift+B)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'B') {
                e.preventDefault();
                this.showModal();
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hideModal();
            }
        });
    }
}

// Initialize
if (!window.cbdBugReporter) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.cbdBugReporter) {
                window.cbdBugReporter = new CBDBugReporter();
            }
        });
    } else {
        window.cbdBugReporter = new CBDBugReporter();
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CBDBugReporter;
}

} // End of duplicate check
