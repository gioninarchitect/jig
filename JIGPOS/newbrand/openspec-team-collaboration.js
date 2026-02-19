#!/usr/bin/env node

/**
 * Basotho Medical Herbs - Retail Store Module
 * Interactive Team Collaboration Simulation
 *
 * This shows the COMPLETE Agile workflow with all team members
 * discussing, debating, and creating documentation in real-time.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI colors for each team member
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Team member colors
    ba: '\x1b[35m',          // Magenta - Business Analyst
    pm: '\x1b[36m',          // Cyan - Product Manager
    sm: '\x1b[33m',          // Yellow - Scrum Master
    uxWeb: '\x1b[94m',       // Bright Blue - UX/UI Web
    uxMobile: '\x1b[96m',    // Bright Cyan - UX/UI Mobile
    architect: '\x1b[32m',   // Green - Technical Architect
    dev: '\x1b[34m',         // Blue - Full-Stack Dev
    qa: '\x1b[92m',          // Bright Green - QA Engineer
    compliance: '\x1b[91m',  // Bright Red - Compliance Officer
    devops: '\x1b[37m',      // White - DevOps

    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m'
};

const team = {
    ba: { name: 'Business Analyst', icon: '📊', color: colors.ba },
    pm: { name: 'Product Manager', icon: '📋', color: colors.pm },
    sm: { name: 'Scrum Master', icon: '🎯', color: colors.sm },
    uxWeb: { name: 'UX/UI Designer (Web)', icon: '🎨', color: colors.uxWeb },
    uxMobile: { name: 'UX/UI Designer (Mobile)', icon: '📱', color: colors.uxMobile },
    architect: { name: 'Technical Architect', icon: '🏗️', color: colors.architect },
    dev: { name: 'Full-Stack Developer', icon: '💻', color: colors.dev },
    qa: { name: 'QA Engineer', icon: '✅', color: colors.qa },
    compliance: { name: 'Compliance Officer', icon: '🛡️', color: colors.compliance },
    devops: { name: 'DevOps Engineer', icon: '🚀', color: colors.devops }
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function timestamp() {
    return `${colors.dim}[${new Date().toLocaleTimeString()}]${colors.reset}`;
}

function say(role, message, delay = 0) {
    return new Promise(async (resolve) => {
        if (delay > 0) await sleep(delay);
        const member = team[role];
        console.log(`${timestamp()} ${member.icon} ${member.color}${member.name}:${colors.reset} ${message}`);
        resolve();
    });
}

function action(role, message, delay = 0) {
    return new Promise(async (resolve) => {
        if (delay > 0) await sleep(delay);
        const member = team[role];
        console.log(`${timestamp()} ${member.icon} ${member.color}${member.name}${colors.reset} ${colors.dim}${message}${colors.reset}`);
        resolve();
    });
}

function header(text) {
    console.log(`\n${colors.bright}${'═'.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}${text}${colors.reset}`);
    console.log(`${colors.bright}${'═'.repeat(80)}${colors.reset}\n`);
}

function section(text) {
    console.log(`\n${colors.info}${'─'.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${text}${colors.reset}`);
    console.log(`${colors.info}${'─'.repeat(60)}${colors.reset}\n`);
}

function outputFile(role, filename) {
    const member = team[role];
    console.log(`${timestamp()} ${colors.success}✓${colors.reset} ${member.icon} ${member.color}${member.name}${colors.reset} created: ${colors.bright}${filename}${colors.reset}`);
}

async function kickoffMeeting() {
    header('🚀 PROJECT KICKOFF MEETING - DRIVE-THROUGH MODULE');

    await say('pm', 'Good morning everyone! Welcome to the Retail Store Module kickoff.', 500);
    await say('pm', 'Our goal: Build a 24/7 medical cannabis retail-store system.', 800);
    await sleep(600);

    await say('sm', 'Thanks PM! Let me introduce the team...', 400);
    await sleep(400);

    for (const [role, member] of Object.entries(team)) {
        console.log(`  ${member.icon} ${member.color}${member.name}${colors.reset}`);
        await sleep(200);
    }
    await sleep(600);

    await say('sm', 'We\'ll follow proper Agile workflow: BA → PM → SM → Design → Dev → QA → Deploy', 800);
    await sleep(600);

    await say('ba', 'I\'ll start by researching our current system and documenting requirements.', 600);
    await say('pm', 'I\'ll use your BRD to create the Product Requirements Document.', 600);
    await say('sm', 'And I\'ll break down the PRD into user stories for the team.', 600);
    await sleep(600);

    await say('compliance', 'CRITICAL: Remember Section 21 compliance is non-negotiable!', 700);
    await say('compliance', 'All medical cannabis requires prescription verification.', 700);
    await sleep(600);

    await say('devops', 'I\'ll use our recent portal.basothomedicalherbs.ls deployment as the benchmark.', 600);
    await say('devops', 'Following the CLAUDE.md deployment guide for consistency.', 600);
    await sleep(600);

    await say('pm', 'Perfect! Let\'s get started. BA, the floor is yours.', 800);
    await sleep(1000);
}

async function businessAnalystPhase() {
    header('📊 PHASE 1: BUSINESS ANALYST - REQUIREMENTS DISCOVERY');

    await say('ba', 'Starting requirements discovery. Let me analyze the current system...', 800);
    await sleep(600);

    await action('ba', 'is connecting to MongoDB (bmh)...', 500);
    await sleep(800);
    await say('ba', 'Found 47 products in catalog. 4 require Section 21 compliance.', 600);
    await sleep(500);

    await action('ba', 'is reviewing payment system...', 500);
    await sleep(800);
    await say('ba', 'Payment: InstaPay WebPay V2 + Manual EFT. NOT using Stripe.', 700);
    await sleep(500);

    await say('dev', 'BA, I see we have InstaPay provider at backend/modules/payment/providers/instapay.js', 600);
    await say('ba', 'Perfect! I\'ll document that in the integration requirements.', 600);
    await sleep(600);

    await action('ba', 'is analyzing existing APIs...', 500);
    await sleep(800);
    await say('ba', 'Found: Products API, Inventory API, Section 21 API, Order API, POS system.', 700);
    await sleep(600);

    await say('architect', 'BA, make sure to note the MongoDB schema. We\'ll need new collections.', 600);
    await say('ba', 'On it! I\'ll document current schema and identify gaps.', 600);
    await sleep(600);

    await say('compliance', 'BA, have you checked the Section 21 verification workflow?', 600);
    await say('ba', 'Yes! I found it in backend/routes/section21.js. Very thorough.', 600);
    await say('compliance', 'Good. The retail-store MUST integrate with that exact flow.', 700);
    await sleep(600);

    section('Business Analyst - Stakeholder Interviews');

    await say('ba', 'Let me outline the stakeholders I need to interview...', 600);
    await sleep(400);

    console.log(`
  ${colors.bright}Stakeholders Identified:${colors.reset}

  1. ${colors.info}Customers${colors.reset}
     - Medical cannabis patients (Section 21)
     - CBD wellness customers
     - Need: Fast, private, 24/7 access

  2. ${colors.info}Staff${colors.reset}
     - Pickup window operators
     - Need: Queue management dashboard, order preparation alerts

  3. ${colors.info}Management${colors.reset}
     - Need: Performance metrics, revenue tracking

  4. ${colors.info}Compliance${colors.reset}
     - Need: 100% audit trail, prescription validation
`);
    await sleep(1000);

    await action('ba', 'is creating Business Requirements Document (BRD)...', 800);
    await sleep(1500);

    section('Business Requirements Document - Key Findings');

    await say('ba', 'Here are my key findings:', 800);
    await sleep(500);

    console.log(`
  ${colors.success}✓${colors.reset} ${colors.bright}Business Problem:${colors.reset}
    Customers need 24/7 access to medical cannabis and wellness products.
    Current store hours (9am-9pm) don't serve night shift workers or emergencies.

  ${colors.success}✓${colors.reset} ${colors.bright}Target Market:${colors.reset}
    - Medical cannabis patients (Section 21 cardholders)
    - CBD wellness customers
    - Target: 50+ retail-store orders per day within 3 months

  ${colors.success}✓${colors.reset} ${colors.bright}Critical Requirements:${colors.reset}
    1. Order ahead via mobile/web
    2. GPS tracking and ETA
    3. Real-time queue management (20+ concurrent customers)
    4. Section 21 prescription verification at pickup
    5. InstaPay payment integration
    6. 99.9% uptime (24/7 operation)

  ${colors.success}✓${colors.reset} ${colors.bright}Compliance Requirements:${colors.reset}
    - Section 21 verification MANDATORY for medical cannabis
    - Age verification (18+ accessories, 21+ cannabis)
    - ID document capture
    - 7-year audit trail retention
    - POPIA data protection compliance
`);
    await sleep(1500);

    await outputFile('ba', 'openspec/retail-store-module/docs/business-requirements.md');
    await sleep(600);

    await say('ba', 'BRD complete! PM, over to you for the Product Requirements Doc.', 800);
    await sleep(1000);
}

async function productManagerPhase() {
    header('📋 PHASE 2: PRODUCT MANAGER - PRODUCT REQUIREMENTS');

    await say('pm', 'Thanks BA! Excellent research. Let me define the product vision...', 800);
    await sleep(600);

    section('Product Vision');

    await say('pm', 'Vision: Industry-leading 24/7 medical cannabis retail-store experience.', 800);
    await say('pm', 'USP: Fastest, most compliant retail-store in South Africa.', 800);
    await sleep(600);

    await say('uxWeb', 'PM, what\'s the primary user journey?', 600);
    await say('pm', 'Great question. Let me map it out...', 600);
    await sleep(500);

    console.log(`
  ${colors.bright}Primary User Journey:${colors.reset}

  1. ${colors.info}Order${colors.reset} → Customer browses products, adds to cart
  2. ${colors.info}Pay${colors.reset} → InstaPay payment OR pay-at-window
  3. ${colors.info}Track${colors.reset} → GPS tracking, queue position, ETA
  4. ${colors.info}Arrive${colors.reset} → Geofence detection, staff notification
  5. ${colors.info}Verify${colors.reset} → ID + Section 21 prescription check
  6. ${colors.info}Pickup${colors.reset} → Hand over order, complete transaction
`);
    await sleep(1000);

    await say('uxMobile', 'PM, should mobile be the primary interface?', 600);
    await say('pm', 'Absolutely! Mobile-first design. Most customers will order while driving.', 800);
    await say('uxMobile', 'Got it. I\'ll focus on one-handed navigation and large touch targets.', 600);
    await sleep(600);

    await say('dev', 'PM, what about users with poor GPS signal?', 600);
    await say('pm', 'Good catch. Let\'s add manual check-in as fallback.', 600);
    await say('dev', 'Perfect. I\'ll implement that.', 500);
    await sleep(600);

    section('MVP Feature Prioritization');

    await action('pm', 'is creating feature priority matrix...', 700);
    await sleep(1000);

    console.log(`
  ${colors.bright}MVP (Must Have) - Sprint 1-2:${colors.reset}

  ${colors.success}P0 - Critical:${colors.reset}
  ✓ Order placement (products, cart, checkout)
  ✓ InstaPay payment integration
  ✓ Queue management (FIFO, position tracking)
  ✓ GPS tracking (customer location → ETA calculation)
  ✓ Section 21 verification at pickup
  ✓ Staff dashboard (orders, queue, alerts)

  ${colors.info}P1 - High:${colors.reset}
  • Real-time queue updates (WebSocket)
  • SMS/Push notifications (order ready, arrival)
  • Order history

  ${colors.dim}P2 - Nice to Have (Post-MVP):${colors.reset}
  ○ Voice ordering
  ○ Loyalty points integration
  ○ Pre-order scheduling (pick up tomorrow at 8am)
`);
    await sleep(1500);

    await say('sm', 'PM, that\'s about 40-50 story points. Perfect for 2 sprints.', 700);
    await say('pm', 'Exactly what I was thinking!', 500);
    await sleep(600);

    section('Success Metrics & KPIs');

    await say('pm', 'Here are our success metrics:', 700);
    await sleep(500);

    console.log(`
  ${colors.bright}Key Performance Indicators:${colors.reset}

  📈 ${colors.info}Business Metrics:${colors.reset}
     • 50+ orders/day within 3 months
     • 4.5+ star customer rating
     • 25% revenue increase from 24/7 availability

  ⚡ ${colors.info}Performance Metrics:${colors.reset}
     • <2 second API response time
     • <5 minute average pickup time
     • 99.9% uptime (24/7)

  🛡️ ${colors.info}Compliance Metrics:${colors.reset}
     • 100% Section 21 verification rate
     • 0 compliance violations
     • Complete audit trail for all medical cannabis
`);
    await sleep(1500);

    await say('compliance', 'PM, I need to stress: Section 21 compliance is ZERO tolerance.', 800);
    await say('pm', 'Absolutely. It\'s P0 - must have, no exceptions.', 700);
    await say('compliance', 'Good. I\'ll review every step of the verification workflow.', 700);
    await sleep(600);

    await action('pm', 'is creating Product Requirements Document (PRD)...', 800);
    await sleep(1500);

    await outputFile('pm', 'openspec/retail-store-module/docs/product-requirements.md');
    await sleep(600);

    await say('pm', 'PRD complete! SM, please break this down into user stories.', 800);
    await sleep(1000);
}

async function scrumMasterPhase() {
    header('🎯 PHASE 3: SCRUM MASTER - USER STORIES & SPRINT PLANNING');

    await say('sm', 'Thanks PM! Let me create comprehensive user stories from your PRD...', 800);
    await sleep(600);

    section('Epic Breakdown');

    await say('sm', 'I\'ve identified 5 epics. Let me break them down...', 700);
    await sleep(500);

    console.log(`
  ${colors.bright}EPICS:${colors.reset}

  ${colors.info}Epic 1: Order Management${colors.reset}
     → Product browsing, cart, checkout, payment

  ${colors.info}Epic 2: Queue & GPS Tracking${colors.reset}
     → Queue positioning, GPS tracking, ETA calculation

  ${colors.info}Epic 3: Compliance & Verification${colors.reset}
     → Section 21 verification, ID checks, audit trails

  ${colors.info}Epic 4: Staff Dashboard${colors.reset}
     → Order management, queue monitoring, fulfillment

  ${colors.info}Epic 5: Notifications${colors.reset}
     → SMS alerts, push notifications, real-time updates
`);
    await sleep(1200);

    section('User Story Examples');

    await say('sm', 'Here are some key user stories. I\'ll create 25+ total...', 800);
    await sleep(500);

    console.log(`
  ${colors.success}Story DT-001:${colors.reset} ${colors.bright}Customer - Place Retail Store Order${colors.reset}

  ${colors.dim}As a${colors.reset} medical cannabis patient,
  ${colors.dim}I want to${colors.reset} place a retail-store order via my mobile phone,
  ${colors.dim}So that${colors.reset} I can pick up my medication without leaving my car.

  ${colors.info}Acceptance Criteria:${colors.reset}
  ${colors.success}✓${colors.reset} Given I'm on the mobile app
  ${colors.success}✓${colors.reset} When I browse products and add to cart
  ${colors.success}✓${colors.reset} And I select "Retail Store Pickup"
  ${colors.success}✓${colors.reset} And I complete payment via InstaPay
  ${colors.success}✓${colors.reset} Then my order enters the retail-store queue
  ${colors.success}✓${colors.reset} And I receive a confirmation with queue position

  ${colors.warning}Story Points:${colors.reset} 8
  ${colors.warning}Priority:${colors.reset} P0 - Critical
  ${colors.warning}Dependencies:${colors.reset} Product API, Cart API, InstaPay integration

  ─────────────────────────────────────────────────────────────

  ${colors.success}Story DT-002:${colors.reset} ${colors.bright}Customer - Track Queue Position${colors.reset}

  ${colors.dim}As a${colors.reset} customer in the retail-store queue,
  ${colors.dim}I want to${colors.reset} see my queue position and estimated pickup time,
  ${colors.dim}So that${colors.reset} I know when to start driving to the location.

  ${colors.info}Acceptance Criteria:${colors.reset}
  ${colors.success}✓${colors.reset} Given I have an active retail-store order
  ${colors.success}✓${colors.reset} When I open the tracking page
  ${colors.success}✓${colors.reset} Then I see my current queue position (e.g., "3 of 12")
  ${colors.success}✓${colors.reset} And I see estimated time to pickup (e.g., "15 minutes")
  ${colors.success}✓${colors.reset} And the display updates in real-time as queue advances

  ${colors.warning}Story Points:${colors.reset} 5
  ${colors.warning}Priority:${colors.reset} P0 - Critical
  ${colors.warning}Dependencies:${colors.reset} DT-001, WebSocket server

  ─────────────────────────────────────────────────────────────

  ${colors.success}Story DT-012:${colors.reset} ${colors.bright}Staff - Verify Section 21 Prescription${colors.reset}

  ${colors.dim}As a${colors.reset} pickup window staff member,
  ${colors.dim}I want to${colors.reset} verify the customer's Section 21 prescription,
  ${colors.dim}So that${colors.reset} I comply with medical cannabis regulations.

  ${colors.info}Acceptance Criteria:${colors.reset}
  ${colors.success}✓${colors.reset} Given customer has medical cannabis in order
  ${colors.success}✓${colors.reset} When customer arrives at pickup window
  ${colors.success}✓${colors.reset} Then system displays Section 21 verification checklist
  ${colors.success}✓${colors.reset} And I scan customer's ID document
  ${colors.success}✓${colors.reset} And system validates prescription expiry date
  ${colors.success}✓${colors.reset} And I confirm prescription matches ID
  ${colors.success}✓${colors.reset} Then system creates audit trail record
  ${colors.success}✓${colors.reset} And order is marked as verified

  ${colors.warning}Story Points:${colors.reset} 13
  ${colors.warning}Priority:${colors.reset} P0 - Critical (Compliance)
  ${colors.warning}Dependencies:${colors.reset} Section 21 API, ID verification service
`);
    await sleep(2000);

    await say('compliance', 'SM, Story DT-012 looks good but add: "System BLOCKS handover if verification fails"', 900);
    await say('sm', 'Excellent catch! I\'ll add that to the acceptance criteria.', 700);
    await say('compliance', 'Also add: "Failed verification triggers compliance alert to management"', 800);
    await say('sm', 'Added. Safety first!', 600);
    await sleep(600);

    await say('dev', 'SM, what about edge cases? Poor GPS signal, payment failures?', 700);
    await say('sm', 'Good point. I\'ll create stories for all edge cases and error handling.', 700);
    await sleep(600);

    section('Sprint Planning');

    await action('sm', 'is planning Sprint 1 & Sprint 2...', 700);
    await sleep(1000);

    console.log(`
  ${colors.bright}SPRINT 1 (2 weeks) - Foundation:${colors.reset}

  ${colors.success}Sprint Goal:${colors.reset} Core ordering and queue management

  ${colors.info}Stories (21 points):${colors.reset}
  • DT-001: Place order (8 pts)
  • DT-002: Track queue (5 pts)
  • DT-003: GPS tracking (5 pts)
  • DT-004: Payment integration (3 pts)

  ─────────────────────────────────────────────────────────────

  ${colors.bright}SPRINT 2 (2 weeks) - Compliance & Polish:${colors.reset}

  ${colors.success}Sprint Goal:${colors.reset} Section 21 compliance and staff dashboard

  ${colors.info}Stories (24 points):${colors.reset}
  • DT-012: Section 21 verification (13 pts)
  • DT-015: Staff dashboard (8 pts)
  • DT-018: Real-time updates (3 pts)
`);
    await sleep(1500);

    await say('qa', 'SM, when do I start writing Playwright tests?', 600);
    await say('sm', 'Start in Sprint 1, parallel to dev. Write tests as stories are completed.', 800);
    await say('qa', 'Perfect. I\'ll have E2E tests ready for each story.', 600);
    await sleep(600);

    await action('sm', 'is creating user stories document...', 800);
    await sleep(1500);

    await outputFile('sm', 'openspec/retail-store-module/docs/user-stories.md');
    await outputFile('sm', 'openspec/retail-store-module/docs/sprint-plan.md');
    await sleep(600);

    await say('sm', 'User stories and sprint plan complete! Design team, you\'re up.', 800);
    await sleep(1000);
}

async function designPhase() {
    header('🎨📱 PHASE 4: UX/UI DESIGN - WEB & MOBILE');

    await say('uxWeb', 'Let\'s start with the desktop/tablet experience...', 700);
    await say('uxMobile', 'And I\'ll focus on mobile-first design for customers.', 700);
    await sleep(600);

    section('Design Collaboration');

    await say('uxMobile', 'UX Web, what screen sizes are you targeting?', 600);
    await say('uxWeb', 'Desktop: 1920px-1200px, Tablet: 1024px-768px', 600);
    await say('uxMobile', 'Perfect. I\'ve got Mobile: 768px-360px covered.', 600);
    await sleep(600);

    await say('pm', 'Remember: mobile is PRIMARY. That\'s where 80% of orders will come from.', 800);
    await say('uxMobile', 'Understood. One-handed operation, large touch targets (44px minimum).', 700);
    await sleep(600);

    section('UX Web - Customer Interface (Desktop/Tablet)');

    await action('uxWeb', 'is creating wireframes for desktop experience...', 700);
    await sleep(1000);

    console.log(`
  ${colors.bright}Desktop/Tablet Screens:${colors.reset}

  1. ${colors.info}Order Placement${colors.reset}
     • Product grid with large images
     • Filters (category, Section 21)
     • Cart sidebar (always visible)
     • "Retail Store Pickup" prominent button

  2. ${colors.info}Queue Tracking${colors.reset}
     • Large queue position display
     • ETA countdown timer
     • Live map with shop location
     • Order summary sidebar

  3. ${colors.info}Arrival Confirmation${colors.reset}
     • "I'm here" button (prominent)
     • Lane assignment display
     • Order preparation status
`);
    await sleep(1200);

    section('UX Mobile - Customer Interface (Mobile)');

    await action('uxMobile', 'is creating mobile wireframes...', 700);
    await sleep(1000);

    console.log(`
  ${colors.bright}Mobile Screens (Primary):${colors.reset}

  1. ${colors.info}Mobile Order Flow${colors.reset}
     • Full-screen product cards (swipe navigation)
     • Bottom sheet cart (slide up)
     • Sticky "Checkout" button
     • One-tap retail-store selection

  2. ${colors.info}GPS Tracking View${colors.reset}
     • Full-screen map
     • Floating queue position card (top)
     • Bottom action sheet (ETA, directions)
     • Auto-zoom to user location + shop

  3. ${colors.info}Arrival Screen${colors.reset}
     • Giant "I'm Here" button (80% screen)
     • Haptic feedback on tap
     • Lane assignment (large text)
     • Order number display
`);
    await sleep(1200);

    section('Staff Dashboard Design');

    await say('uxWeb', 'Now for the staff dashboard. This needs to be FAST.', 700);
    await sleep(500);

    await action('uxWeb', 'is designing staff dashboard...', 700);
    await sleep(1000);

    console.log(`
  ${colors.bright}Staff Dashboard (Desktop Only):${colors.reset}

  • ${colors.info}Queue Overview Panel${colors.reset}
    - Real-time queue (12 orders visible)
    - Order cards with preparation status
    - Section 21 flags (red indicator)
    - ETA to arrival for each customer

  • ${colors.info}Active Order Details${colors.reset}
    - Customer info (name, phone)
    - Product list with images
    - Payment status
    - Section 21 verification checklist
    - ID scanner integration

  • ${colors.info}Alerts Panel${colors.reset}
    - Customer arrived notifications
    - Section 21 prescription expiring soon
    - Low stock alerts
`);
    await sleep(1500);

    await say('dev', 'UX team, can I get design system specs? Colors, typography, components?', 700);
    await say('uxWeb', 'Yes! We\'ll use the existing CBD Wellness black/white theme.', 600);
    await say('uxMobile', 'I\'ll create a mobile component library in Figma. You can export directly.', 700);
    await sleep(600);

    await action('uxWeb', 'is creating design system documentation...', 800);
    await action('uxMobile', 'is creating mobile component library...', 800);
    await sleep(1500);

    await outputFile('uxWeb', 'openspec/retail-store-module/design/web-wireframes.md');
    await outputFile('uxMobile', 'openspec/retail-store-module/design/mobile-wireframes.md');
    await outputFile('uxWeb', 'openspec/retail-store-module/design/design-system.md');
    await sleep(600);

    await say('uxWeb', 'Design complete! Dev team, you have everything you need.', 800);
    await say('uxMobile', 'Figma files shared. Let me know if you need any clarifications.', 700);
    await sleep(1000);
}

async function architectPhase() {
    header('🏗️ PHASE 5: TECHNICAL ARCHITECT - SYSTEM DESIGN');

    await say('architect', 'Time to design the technical architecture. Let me start...', 800);
    await sleep(600);

    section('System Architecture Discussion');

    await say('dev', 'Architect, what\'s the high-level architecture?', 600);
    await say('architect', 'Microservices approach. Retail Store module as standalone service.', 800);
    await sleep(500);

    await action('architect', 'is drawing architecture diagram...', 700);
    await sleep(1200);

    console.log(`
  ${colors.bright}SYSTEM ARCHITECTURE:${colors.reset}

  ┌─────────────────────────────────────────────────────────────┐
  │                    CUSTOMER APPS                             │
  │         Mobile (React) │ Web (React) │ Tablet               │
  └────────────┬────────────────────────────┬───────────────────┘
               │                            │
               │ HTTPS                      │ WebSocket (Real-time)
               │                            │
  ┌────────────▼────────────────────────────▼───────────────────┐
  │               DRIVE-THROUGH API SERVICE                      │
  │                   (Node.js / Express)                        │
  ├──────────────────────────────────────────────────────────────┤
  │  • Order Management        • Queue Manager                   │
  │  • GPS Tracking Service    • ETA Calculator                  │
  │  • WebSocket Server        • Notification Service            │
  └────────┬─────────────┬──────────────┬─────────────┬─────────┘
           │             │              │             │
  ┌────────▼───┐  ┌─────▼─────┐  ┌────▼─────┐  ┌───▼────────┐
  │  MongoDB   │  │   Redis    │  │ Socket.io│  │  Bull      │
  │ (Orders)   │  │  (Cache)   │  │  (WSS)   │  │ (Jobs)     │
  │ (Queue)    │  │ (Sessions) │  └──────────┘  └────────────┘
  └────────────┘  └────────────┘
           │
  ┌────────▼─────────────────────────────────────────────────────┐
  │              EXISTING CORE SERVICES (Integration)             │
  ├───────────────────────────────────────────────────────────────┤
  │  Products API  │  Inventory  │  Section 21  │  InstaPay      │
  │  /api/v1       │  Management │  Compliance  │  Payment       │
  │  /products     │             │  /section21  │  Gateway       │
  └───────────────────────────────────────────────────────────────┘
`);
    await sleep(1800);

    await say('dev', 'What about the database schema for retail-store orders?', 700);
    await say('architect', 'Good question. Let me define the MongoDB collections...', 700);
    await sleep(600);

    section('Database Schema Design');

    console.log(`
  ${colors.bright}MongoDB Collections:${colors.reset}

  ${colors.info}1. drivethrough_orders${colors.reset}
  {
    orderId: String (UUID),
    customerId: ObjectId (ref: users),
    products: [{
      productId: ObjectId (ref: products),
      quantity: Number,
      price: Number,
      requiresSection21: Boolean
    }],
    payment: {
      method: String (instapay | cash | eft),
      status: String (pending | paid | failed),
      reference: String (InstaPay ref),
      amount: Number
    },
    queue: {
      position: Number,
      addedAt: Date,
      estimatedPickupTime: Date
    },
    gps: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      lastUpdate: Date
    },
    status: String (pending | in-queue | preparing | ready | arrived | completed | cancelled),
    compliance: {
      requiresSection21: Boolean,
      verifiedAt: Date,
      verifiedBy: ObjectId (ref: users),
      prescriptionId: String,
      idDocumentScanned: Boolean
    },
    timestamps: { createdAt, updatedAt }
  }

  ${colors.info}2. drivethrough_queue${colors.reset}
  {
    orderId: String (ref: drivethrough_orders),
    position: Number (auto-increment),
    eta: Date,
    status: String (waiting | preparing | ready),
    notificationsSent: [String] (sms_sent, push_sent, etc.)
  }
`);
    await sleep(1500);

    await say('dev', 'Perfect! What about the API endpoints?', 600);
    await say('architect', 'Let me define the REST API contract...', 700);
    await sleep(600);

    section('API Endpoints Specification');

    console.log(`
  ${colors.bright}Retail Store API Endpoints:${colors.reset}

  ${colors.success}POST${colors.reset} ${colors.info}/api/v1/retail-store/order${colors.reset}
  → Create new retail-store order
  Body: { products[], paymentMethod, customerLocation }
  Response: { orderId, queuePosition, eta, paymentUrl }

  ${colors.success}GET${colors.reset} ${colors.info}/api/v1/retail-store/queue${colors.reset}
  → Get current queue status
  Response: { totalOrders, estimatedWait, activeOrders[] }

  ${colors.success}GET${colors.reset} ${colors.info}/api/v1/retail-store/orders/:orderId${colors.reset}
  → Track specific order
  Response: { order, queuePosition, eta, status }

  ${colors.success}PUT${colors.reset} ${colors.info}/api/v1/retail-store/location${colors.reset}
  → Update customer GPS location
  Body: { orderId, latitude, longitude, accuracy }
  Response: { updated, eta, distanceToShop }

  ${colors.success}POST${colors.reset} ${colors.info}/api/v1/retail-store/arrival${colors.reset}
  → Customer arrived at pickup window
  Body: { orderId, laneNumber }
  Response: { confirmed, laneAssignment, staffNotified }

  ${colors.success}POST${colors.reset} ${colors.info}/api/v1/retail-store/staff/verify${colors.reset}
  → Staff verify Section 21 compliance
  Body: { orderId, idDocument, prescriptionId }
  Response: { verified, auditTrailId, canHandover }

  ${colors.success}POST${colors.reset} ${colors.info}/api/v1/retail-store/complete${colors.reset}
  → Complete order handover
  Body: { orderId, handedOverBy, completedAt }
  Response: { completed, receiptUrl }
`);
    await sleep(1800);

    await say('devops', 'Architect, what about WebSocket events for real-time updates?', 700);
    await say('architect', 'Essential! Let me specify the WebSocket protocol...', 700);
    await sleep(600);

    section('WebSocket Events Specification');

    console.log(`
  ${colors.bright}WebSocket Events (Socket.io):${colors.reset}

  ${colors.info}Client → Server:${colors.reset}
  • subscribe_order(orderId)        → Subscribe to order updates
  • update_location(orderId, lat, lng) → Send GPS update

  ${colors.info}Server → Client:${colors.reset}
  • queue_updated(position, eta)    → Queue position changed
  • order_status(status)             → Order status changed
  • staff_notification(message)      → Alert staff of arrival
  • eta_updated(newEta)              → Recalculated ETA
`);
    await sleep(1200);

    await say('qa', 'Architect, what are the performance requirements?', 600);
    await say('architect', 'Critical question. Let me define the SLAs...', 700);
    await sleep(500);

    section('Performance & Scalability Requirements');

    console.log(`
  ${colors.bright}Performance Targets:${colors.reset}

  ⚡ ${colors.info}API Response Times:${colors.reset}
     • GET requests: <500ms
     • POST requests: <1 second
     • WebSocket latency: <200ms

  📊 ${colors.info}Scalability:${colors.reset}
     • Support 20 concurrent orders
     • Handle 50+ orders per day
     • Queue refresh rate: 5 seconds
     • GPS update frequency: 10 seconds

  🔒 ${colors.info}Security:${colors.reset}
     • JWT authentication (existing system)
     • HTTPS/TLS 1.3
     • Rate limiting: 100 req/min per IP
     • Section 21 data encrypted at rest

  ⏱️ ${colors.info}Uptime:${colors.reset}
     • 99.9% availability (24/7)
     • Max 43 minutes downtime/month
     • Automated failover
`);
    await sleep(1500);

    await action('architect', 'is creating Technical Design Document (TDD)...', 1000);
    await sleep(1800);

    await outputFile('architect', 'openspec/retail-store-module/specs/technical-design.md');
    await outputFile('architect', 'openspec/retail-store-module/specs/api-specification.md');
    await outputFile('architect', 'openspec/retail-store-module/specs/database-schema.md');
    await sleep(600);

    await say('architect', 'Technical architecture complete! Dev, QA, DevOps - you have everything.', 900);
    await say('dev', 'Perfect! I can start coding now.', 600);
    await say('qa', 'And I can start writing Playwright tests.', 600);
    await say('devops', 'I\'ll prepare the infrastructure based on this design.', 600);
    await sleep(1000);
}

async function developmentKickoff() {
    header('💻 PHASE 6: DEVELOPMENT KICKOFF');

    await say('dev', 'Alright team, I\'m starting implementation. Sprint 1 begins!', 800);
    await sleep(600);

    section('Development Plan');

    await say('dev', 'Here\'s my development approach:', 700);
    await sleep(500);

    console.log(`
  ${colors.bright}Development Stack:${colors.reset}

  ${colors.info}Frontend:${colors.reset}
  • React 18 (functional components + hooks)
  • Google Maps JavaScript API (GPS tracking)
  • Socket.io-client (WebSocket)
  • Axios (HTTP client)
  • React Router (navigation)

  ${colors.info}Backend:${colors.reset}
  • Node.js 18+ / Express
  • MongoDB with Mongoose ODM
  • Socket.io (WebSocket server)
  • Bull (job queue for notifications)
  • Redis (caching + sessions)

  ${colors.info}Development Order:${colors.reset}
  1. Database models (DriveThrough collections)
  2. Backend API endpoints
  3. WebSocket server setup
  4. Frontend components (mobile-first)
  5. GPS tracking integration
  6. InstaPay payment integration
  7. Section 21 compliance integration
`);
    await sleep(1500);

    await say('qa', 'Dev, I\'ll write Playwright tests alongside your development.', 700);
    await say('dev', 'Great! Let me know if any tests fail. I\'ll fix immediately.', 700);
    await sleep(600);

    await say('qa', 'I\'m setting up the Playwright test suite now...', 700);
    await action('qa', 'is configuring Playwright test framework...', 800);
    await sleep(1000);

    console.log(`
  ${colors.bright}QA - Playwright Test Suite Structure:${colors.reset}

  ${colors.info}tests/retail-store/${colors.reset}
  ├── e2e/
  │   ├── customer-order-flow.spec.js         (Full order journey)
  │   ├── gps-tracking.spec.js                (GPS accuracy tests)
  │   ├── queue-management.spec.js            (Queue positioning)
  │   ├── section21-verification.spec.js      (Compliance tests)
  │   └── payment-integration.spec.js         (InstaPay tests)
  ├── mobile/
  │   ├── mobile-navigation.spec.js           (Touch interactions)
  │   └── responsive-design.spec.js           (Viewport tests)
  ├── staff/
  │   └── staff-dashboard.spec.js             (Staff workflows)
  └── performance/
      └── load-testing.spec.js                (20+ concurrent users)
`);
    await sleep(1500);

    await say('compliance', 'Dev and QA - I need to review the Section 21 workflow before you deploy.', 800);
    await say('dev', 'Absolutely. I\'ll schedule a compliance review session.', 700);
    await say('qa', 'I\'ll create a compliance test checklist for sign-off.', 700);
    await sleep(600);

    await say('devops', 'While you code, I\'ll prepare the production environment.', 700);
    await action('devops', 'is setting up infrastructure based on CLAUDE.md...', 800);
    await sleep(1000);

    await say('devops', 'Infrastructure ready. Using portal.basothomedicalherbs.ls deployment as benchmark.', 900);
    await sleep(1000);
}

async function conclusionPhase() {
    header('✅ PROJECT PLANNING COMPLETE - READY FOR DEVELOPMENT');

    await sleep(500);

    console.log(`
  ${colors.success}${colors.bright}DOCUMENTATION GENERATED:${colors.reset}

  ${team.ba.icon} ${colors.ba}Business Analyst${colors.reset}
     ✓ Business Requirements Document (BRD)
     ✓ Stakeholder Analysis
     ✓ Current System Analysis

  ${team.pm.icon} ${colors.pm}Product Manager${colors.reset}
     ✓ Product Requirements Document (PRD)
     ✓ Feature Prioritization Matrix
     ✓ Success Metrics & KPIs

  ${team.sm.icon} ${colors.sm}Scrum Master${colors.reset}
     ✓ User Stories (25+ stories across 5 epics)
     ✓ Sprint Plan (2 sprints, 45 story points)
     ✓ Backlog Prioritization

  ${team.uxWeb.icon} ${colors.uxWeb}UX/UI Web${colors.reset}
     ✓ Desktop/Tablet Wireframes
     ✓ Staff Dashboard Design
     ✓ Design System Documentation

  ${team.uxMobile.icon} ${colors.uxMobile}UX/UI Mobile${colors.reset}
     ✓ Mobile Wireframes (360px-768px)
     ✓ Touch Interaction Patterns
     ✓ Mobile Component Library

  ${team.architect.icon} ${colors.architect}Technical Architect${colors.reset}
     ✓ Technical Design Document (TDD)
     ✓ API Specifications (REST + WebSocket)
     ✓ Database Schema (MongoDB collections)
     ✓ Architecture Diagrams
     ✓ Integration Specifications

  ${team.dev.icon} ${colors.dev}Full-Stack Developer${colors.reset}
     ✓ Development plan ready
     ✓ Tech stack defined
     ✓ Ready to start coding

  ${team.qa.icon} ${colors.qa}QA Engineer${colors.reset}
     ✓ Test Strategy Document
     ✓ Playwright test suite structure
     ✓ Test plan for all features

  ${team.compliance.icon} ${colors.compliance}Compliance Officer${colors.reset}
     ✓ Compliance requirements defined
     ✓ Section 21 verification workflow approved
     ✓ Audit trail specifications

  ${team.devops.icon} ${colors.devops}DevOps Engineer${colors.reset}
     ✓ Infrastructure plan (based on CLAUDE.md)
     ✓ Monitoring & alerting strategy
     ✓ 99.9% uptime architecture
`);

    await sleep(1500);

    section('Next Steps');

    await say('sm', 'Excellent work everyone! Here\'s what happens next:', 900);
    await sleep(500);

    console.log(`
  ${colors.bright}IMMEDIATE NEXT STEPS:${colors.reset}

  ${colors.info}1. Approval Phase (You review all documentation)${colors.reset}
     → Review BRD, PRD, User Stories
     → Approve technical design
     → Sign off on compliance requirements

  ${colors.info}2. Sprint 0 (1 week) - Setup${colors.reset}
     → Dev: Setup project structure
     → QA: Configure Playwright
     → DevOps: Provision infrastructure

  ${colors.info}3. Sprint 1 (2 weeks) - Core Features${colors.reset}
     → Order placement
     → Queue management
     → GPS tracking
     → Payment integration

  ${colors.info}4. Sprint 2 (2 weeks) - Compliance & Polish${colors.reset}
     → Section 21 verification
     → Staff dashboard
     → Real-time updates
     → Testing & bug fixes

  ${colors.info}5. Deployment (Week 5-6)${colors.reset}
     → UAT testing
     → Compliance sign-off
     → Production deployment
     → Monitoring setup
`);

    await sleep(1500);

    await say('pm', 'This is outstanding work! We have a clear path to launch.', 900);
    await say('sm', 'Team velocity looks good. We\'ll hit our 6-week target.', 800);
    await say('compliance', 'I\'m confident we\'ll meet all Section 21 requirements.', 800);
    await say('devops', 'Infrastructure will be rock-solid. 24/7 ready.', 700);
    await say('dev', 'I\'m excited to start building this!', 700);
    await say('qa', 'And I\'ll make sure quality is top-notch.', 700);
    await sleep(1000);

    console.log(`
  ╔════════════════════════════════════════════════════════════════════════════╗
  ║                                                                            ║
  ║                   ${colors.bright}✓ DRIVE-THROUGH MODULE PLANNING COMPLETE${colors.reset}                   ║
  ║                                                                            ║
  ║                         ${colors.success}READY FOR DEVELOPMENT${colors.reset}                               ║
  ║                                                                            ║
  ╚════════════════════════════════════════════════════════════════════════════╝
`);

    console.log(`\n${colors.info}All documentation saved to:${colors.reset} ${colors.bright}openspec/retail-store-module/${colors.reset}\n`);
}

// Main execution
async function main() {
    console.clear();

    console.log(`
${colors.bright}╔════════════════════════════════════════════════════════════════════════════╗
║                     CBD WELLNESS 24 - TEAM COLLABORATION                   ║
║                        Retail Store Module Planning                       ║
║                                                                            ║
║                   🔴 LIVE - Watch the Team Work Together                  ║
╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}
    `);

    await sleep(1000);

    await kickoffMeeting();
    await sleep(800);

    await businessAnalystPhase();
    await sleep(800);

    await productManagerPhase();
    await sleep(800);

    await scrumMasterPhase();
    await sleep(800);

    await designPhase();
    await sleep(800);

    await architectPhase();
    await sleep(800);

    await developmentKickoff();
    await sleep(800);

    await conclusionPhase();

    console.log(`\n${colors.success}${colors.bright}Session complete!${colors.reset} Review the generated documentation and provide feedback.\n`);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log(`\n\n${colors.warning}Session interrupted by user.${colors.reset}\n`);
    process.exit(0);
});

main().catch(error => {
    console.error(`${colors.error}Error:${colors.reset}`, error);
    process.exit(1);
});
