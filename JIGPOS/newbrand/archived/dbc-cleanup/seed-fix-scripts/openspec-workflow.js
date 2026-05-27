#!/usr/bin/env node

/**
 * OpenSpec Workflow Simulation
 * Demonstrates multi-role collaboration for Retail Store Module Specification
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Role colors
    pm: '\x1b[35m',        // Magenta - Product Manager
    architect: '\x1b[36m', // Cyan - Technical Architect
    frontend: '\x1b[33m',  // Yellow - Frontend Developer
    backend: '\x1b[34m',   // Blue - Backend Developer
    qa: '\x1b[32m',        // Green - QA Engineer
    compliance: '\x1b[31m',// Red - Compliance Officer
    devops: '\x1b[37m',    // White - DevOps Engineer

    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m'
};

// Role definitions
const roles = {
    'Product Manager': {
        color: colors.pm,
        icon: '📋',
        responsibilities: ['Define requirements', 'Prioritize features', 'Validate UX flows']
    },
    'Technical Architect': {
        color: colors.architect,
        icon: '🏗️',
        responsibilities: ['Design system architecture', 'Define API contracts', 'Plan scalability']
    },
    'Frontend Developer': {
        color: colors.frontend,
        icon: '🎨',
        responsibilities: ['Build customer interface', 'Implement GPS tracking', 'Create responsive UI']
    },
    'Backend Developer': {
        color: colors.backend,
        icon: '⚙️',
        responsibilities: ['Implement API endpoints', 'Build queue logic', 'Integrate compliance checks']
    },
    'QA Engineer': {
        color: colors.qa,
        icon: '✅',
        responsibilities: ['Create test plans', 'Verify compliance', 'Load testing']
    },
    'Compliance Officer': {
        color: colors.compliance,
        icon: '🛡️',
        responsibilities: ['Verify Section 21 compliance', 'Approve audit trails', 'Review data handling']
    },
    'DevOps Engineer': {
        color: colors.devops,
        icon: '🚀',
        responsibilities: ['Setup deployment', 'Configure monitoring', 'Plan disaster recovery']
    }
};

function log(role, message, type = 'info') {
    const roleConfig = roles[role] || {};
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `${colors.dim}[${timestamp}]${colors.reset} ${roleConfig.icon || '•'} ${roleConfig.color}[${role}]${colors.reset}`;
    console.log(`${prefix} ${message}`);
}

function header(text) {
    console.log(`\n${colors.bright}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}${text.toUpperCase()}${colors.reset}`);
    console.log(`${colors.bright}${'='.repeat(80)}${colors.reset}\n`);
}

function section(text) {
    console.log(`\n${colors.info}${'-'.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${text}${colors.reset}`);
    console.log(`${colors.info}${'-'.repeat(60)}${colors.reset}\n`);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulateWork(role, task, duration = 500) {
    log(role, `Starting: ${task}...`);
    await sleep(duration);
    log(role, `${colors.success}✓${colors.reset} Completed: ${task}`);
}

async function createOpenSpecStructure() {
    header('OpenSpec Initialization');

    const baseDir = path.join(__dirname, 'openspec/retail-store-module');
    const dirs = ['specs', 'changes', 'archive', 'docs'];

    console.log(`${colors.info}Creating OpenSpec directory structure...${colors.reset}\n`);

    for (const dir of dirs) {
        const dirPath = path.join(baseDir, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`  ${colors.success}✓${colors.reset} Created: ${dir}/`);
        } else {
            console.log(`  ${colors.dim}Already exists: ${dir}/${colors.reset}`);
        }
        await sleep(200);
    }

    console.log(`\n${colors.success}OpenSpec structure ready!${colors.reset}\n`);
}

async function productManagerPhase() {
    header('Phase 1: Product Manager - Requirements Gathering');

    await simulateWork('Product Manager', 'Analyzing business requirements', 800);
    await simulateWork('Product Manager', 'Defining success metrics', 600);
    await simulateWork('Product Manager', 'Prioritizing MVP features', 700);

    section('Product Manager Output');

    const requirements = [
        'Order ahead via web/mobile interface',
        'Real-time queue management with ETA',
        'GPS-based arrival notifications',
        'Section 21 prescription verification',
        'Multiple payment options',
        '24/7 uptime requirement',
        'Support 20 concurrent customers'
    ];

    log('Product Manager', `${colors.bright}Core Requirements Defined:${colors.reset}`);
    requirements.forEach((req, i) => {
        console.log(`  ${i + 1}. ${req}`);
    });

    await sleep(1000);
}

async function architectPhase() {
    header('Phase 2: Technical Architect - System Design');

    await simulateWork('Technical Architect', 'Reviewing current platform architecture', 900);
    await simulateWork('Technical Architect', 'Designing integration points', 1000);
    await simulateWork('Technical Architect', 'Defining API contracts', 800);
    await simulateWork('Technical Architect', 'Planning database schema', 700);

    section('Technical Architect Output');

    log('Technical Architect', `${colors.bright}System Architecture:${colors.reset}`);
    console.log(`
  ┌─────────────────┐
  │  Customer App   │
  └────────┬────────┘
           │ HTTPS/WSS
  ┌────────▼────────────────────┐
  │  Retail Store API Service  │
  ├─────────────────────────────┤
  │ - Queue Management          │
  │ - GPS Tracking             │
  │ - Order Routing            │
  │ - Real-time Updates        │
  └────────┬────────────────────┘
           │
  ┌────────▼─────────┬─────────────┬──────────────┐
  │ MongoDB          │ Redis Cache │ WebSocket    │
  │ (Orders/Queue)   │ (Sessions)  │ (Real-time)  │
  └──────────────────┴─────────────┴──────────────┘
           │
  ┌────────▼────────────────────┐
  │  Existing Core Services     │
  ├─────────────────────────────┤
  │ - Product API               │
  │ - Inventory API             │
  │ - Section 21 API            │
  │ - Payment API (Stripe)      │
  └─────────────────────────────┘
    `);

    log('Technical Architect', `${colors.success}Architecture design complete${colors.reset}`);
    await sleep(1000);
}

async function frontendPhase() {
    header('Phase 3: Frontend Developer - UI/UX Design');

    await simulateWork('Frontend Developer', 'Designing customer order flow', 800);
    await simulateWork('Frontend Developer', 'Creating GPS tracking interface', 900);
    await simulateWork('Frontend Developer', 'Building queue status display', 700);
    await simulateWork('Frontend Developer', 'Implementing real-time updates', 1000);

    section('Frontend Developer Output');

    log('Frontend Developer', `${colors.bright}UI Components Specified:${colors.reset}`);
    const components = [
        'OrderPlacementForm - Product selection and cart',
        'GPSTracker - Real-time location sharing',
        'QueueStatusCard - Position and ETA display',
        'ArrivalConfirmation - Check-in at pickup window',
        'OrderHistory - Past retail-store orders'
    ];

    components.forEach((comp, i) => {
        console.log(`  ${i + 1}. ${comp}`);
    });

    log('Frontend Developer', `${colors.info}Technology: React + Google Maps API + WebSocket${colors.reset}`);
    await sleep(1000);
}

async function backendPhase() {
    header('Phase 4: Backend Developer - API Implementation');

    await simulateWork('Backend Developer', 'Designing queue management algorithm', 1000);
    await simulateWork('Backend Developer', 'Creating retail-store API endpoints', 900);
    await simulateWork('Backend Developer', 'Implementing GPS geofencing logic', 800);
    await simulateWork('Backend Developer', 'Integrating Section 21 compliance checks', 1100);
    await simulateWork('Backend Developer', 'Setting up WebSocket server', 700);

    section('Backend Developer Output');

    log('Backend Developer', `${colors.bright}API Endpoints Defined:${colors.reset}`);
    const endpoints = [
        'POST /api/v1/retail-store/order - Create retail-store order',
        'GET /api/v1/retail-store/queue - Get current queue status',
        'POST /api/v1/retail-store/arrival - Notify arrival at pickup',
        'PUT /api/v1/retail-store/location - Update customer location',
        'GET /api/v1/retail-store/orders/:id - Get order status',
        'POST /api/v1/retail-store/complete - Complete order pickup'
    ];

    endpoints.forEach((endpoint, i) => {
        console.log(`  ${i + 1}. ${endpoint}`);
    });

    await sleep(1000);
}

async function qaPhase() {
    header('Phase 5: QA Engineer - Test Planning');

    await simulateWork('QA Engineer', 'Creating test scenarios for all user flows', 900);
    await simulateWork('QA Engineer', 'Defining GPS accuracy test cases', 700);
    await simulateWork('QA Engineer', 'Planning Section 21 compliance tests', 800);
    await simulateWork('QA Engineer', 'Preparing load testing strategy', 1000);

    section('QA Engineer Output');

    log('QA Engineer', `${colors.bright}Test Coverage Plan:${colors.reset}`);
    const testAreas = [
        'Unit Tests: Queue management logic, GPS calculations',
        'Integration Tests: Order flow, payment processing, compliance checks',
        'E2E Tests: Complete customer journey from order to pickup',
        'Load Tests: 20 concurrent customers, peak hour simulation',
        'Security Tests: Section 21 verification, data encryption',
        'Compliance Tests: Audit trail validation, prescription expiry checks'
    ];

    testAreas.forEach((area, i) => {
        console.log(`  ${i + 1}. ${area}`);
    });

    log('QA Engineer', `${colors.success}Test plan covers 95%+ code coverage target${colors.reset}`);
    await sleep(1000);
}

async function compliancePhase() {
    header('Phase 6: Compliance Officer - Regulatory Review');

    await simulateWork('Compliance Officer', 'Reviewing Section 21 requirements', 900);
    await simulateWork('Compliance Officer', 'Validating ID verification workflow', 800);
    await simulateWork('Compliance Officer', 'Checking audit trail implementation', 1000);
    await simulateWork('Compliance Officer', 'Verifying POPIA data handling', 700);

    section('Compliance Officer Output');

    log('Compliance Officer', `${colors.bright}Compliance Checklist:${colors.reset}`);
    const complianceItems = [
        '✓ Section 21 prescription verification at pickup',
        '✓ Age verification (18+ accessories, 21+ cannabis)',
        '✓ ID document capture and validation',
        '✓ Audit trail for all medical cannabis transactions',
        '✓ Prescription expiry tracking',
        '✓ Quantity limits per prescription enforced',
        '✓ POPIA-compliant patient data handling',
        '✓ Secure data transmission (HTTPS/TLS)',
        '✓ Data retention policy (7 years for medical records)'
    ];

    complianceItems.forEach(item => {
        console.log(`  ${colors.success}${item}${colors.reset}`);
    });

    log('Compliance Officer', `${colors.success}All regulatory requirements met${colors.reset}`);
    await sleep(1000);
}

async function devopsPhase() {
    header('Phase 7: DevOps Engineer - Deployment Planning');

    await simulateWork('DevOps Engineer', 'Configuring production environment', 800);
    await simulateWork('DevOps Engineer', 'Setting up monitoring and alerts', 900);
    await simulateWork('DevOps Engineer', 'Planning CI/CD pipeline', 700);
    await simulateWork('DevOps Engineer', 'Implementing disaster recovery', 1000);

    section('DevOps Engineer Output');

    log('DevOps Engineer', `${colors.bright}Infrastructure Plan:${colors.reset}`);
    console.log(`
  Production Setup:
  - Server: Node.js 18+ on Ubuntu 22.04 LTS
  - Database: MongoDB 6.0 with replica set
  - Cache: Redis 7.0 for sessions and queue state
  - WebSocket: Socket.io cluster mode
  - Load Balancer: Nginx with SSL termination
  - Monitoring: PM2 + Prometheus + Grafana
  - Logging: Winston → ELK Stack
  - Backup: Daily MongoDB snapshots, 30-day retention
  - Uptime Target: 99.9% (43 minutes downtime/month max)
    `);

    log('DevOps Engineer', `${colors.success}Infrastructure ready for 24/7 operation${colors.reset}`);
    await sleep(1000);
}

async function finalReview() {
    header('Phase 8: Final Review & Sign-Off');

    section('All Roles - Specification Review');

    const reviewers = Object.keys(roles);

    for (const role of reviewers) {
        await simulateWork(role, 'Reviewing complete specification', 400);
    }

    console.log();

    for (const role of reviewers) {
        log(role, `${colors.success}✓ APPROVED${colors.reset} - Specification meets requirements`);
        await sleep(300);
    }

    await sleep(500);

    section('Specification Summary');

    console.log(`${colors.bright}Retail Store Module Specification - APPROVED${colors.reset}

📊 Requirements: 15 core features defined
🏗️ Architecture: Modular, scalable design
🎨 Frontend: 5 UI components, mobile-first
⚙️ Backend: 6 API endpoints, WebSocket integration
✅ Testing: 95%+ coverage planned
🛡️ Compliance: 100% Section 21 compliant
🚀 Infrastructure: 99.9% uptime target

${colors.success}Status: READY FOR DEVELOPMENT${colors.reset}

Next Steps:
1. Create detailed technical documentation
2. Begin MVP development (2-3 weeks)
3. QA testing and compliance review
4. Production deployment
    `);
}

async function generateSpecificationFiles() {
    header('Generating OpenSpec Files');

    const baseDir = path.join(__dirname, 'openspec/retail-store-module');

    // Create main specification
    log('Technical Architect', 'Generating main-spec.md...');
    const mainSpec = `# Retail Store Module - Technical Specification

**Version**: 1.0.0
**Status**: Approved for Development
**Last Updated**: ${new Date().toISOString().split('T')[0]}

## Overview

24/7 medical cannabis and wellness products retail-store service with GPS tracking, queue management, and Section 21 compliance.

## Core Features

1. **Order Ahead**: Web/mobile interface for pre-ordering
2. **Queue Management**: Real-time queue with estimated wait times
3. **GPS Tracking**: Customer location tracking and arrival notifications
4. **Section 21 Compliance**: Automated prescription verification
5. **Payment Integration**: Pre-payment or pay-at-window
6. **24/7 Operation**: Always-on service with 99.9% uptime

## Technical Architecture

### API Endpoints

- \`POST /api/v1/retail-store/order\` - Create order
- \`GET /api/v1/retail-store/queue\` - Get queue status
- \`POST /api/v1/retail-store/arrival\` - Notify arrival
- \`PUT /api/v1/retail-store/location\` - Update location
- \`GET /api/v1/retail-store/orders/:id\` - Get order status
- \`POST /api/v1/retail-store/complete\` - Complete pickup

### Database Schema

**DriveThrough Order Collection**:
- orderId, customerId, products[], totalAmount
- queuePosition, estimatedPickupTime
- gpsLocation { lat, lng, accuracy }
- status: pending, in-queue, ready, completed, cancelled
- section21Verified: boolean
- prescriptionId (if applicable)
- timestamps

### Integration Points

- Products API: Inventory checking
- Section 21 API: Prescription validation
- Payment API: Stripe integration
- Notification Service: SMS/Push updates

## Compliance Requirements

All items approved by Compliance Officer:
- Section 21 prescription verification
- Age verification (18+/21+)
- ID document capture
- Audit trail (7-year retention)
- POPIA-compliant data handling

## Performance Targets

- API Response: <2 seconds
- GPS Accuracy: ±50 meters
- Concurrent Users: 20+
- Uptime: 99.9%

## Approval Status

✓ Product Manager - Requirements Approved
✓ Technical Architect - Architecture Approved
✓ Frontend Developer - UI Design Approved
✓ Backend Developer - API Design Approved
✓ QA Engineer - Test Plan Approved
✓ Compliance Officer - Regulatory Compliance Approved
✓ DevOps Engineer - Infrastructure Plan Approved
`;

    fs.writeFileSync(path.join(baseDir, 'specs/main-spec.md'), mainSpec);
    log('Technical Architect', `${colors.success}✓ main-spec.md created${colors.reset}`);
    await sleep(300);

    // Create scenarios
    log('QA Engineer', 'Generating test-scenarios.md...');
    const scenarios = `# Retail Store Module - Test Scenarios

## Scenario 1: Happy Path - Medical Cannabis Order

**Actor**: Patient with valid Section 21 prescription

1. Customer places order via mobile app
2. Adds medical cannabis products to cart
3. System validates prescription expiry
4. Payment processed (R550 total)
5. Order enters queue at position #3
6. Customer starts driving to location
7. GPS tracks approach within 1km radius
8. System sends "5 minutes away" notification
9. Customer arrives at pickup window
10. Staff verifies ID and prescription
11. Order handed over, transaction complete
12. Audit trail recorded

**Expected Result**: Order completed in <5 minutes from arrival

## Scenario 2: Prescription Expired

**Actor**: Patient with expired prescription

1. Customer attempts to order medical cannabis
2. System checks Section 21 API
3. Prescription found to be expired
4. Order blocked with error message
5. Customer directed to renew prescription

**Expected Result**: Order rejected, clear error message

## Scenario 3: Concurrent Queue Management

**Actor**: 20 customers simultaneously

1. 20 customers place orders within 5 minutes
2. System assigns queue positions 1-20
3. GPS tracks all 20 locations
4. ETAs calculated based on queue position
5. As orders complete, queue advances
6. Real-time updates sent to all customers
7. Staff dashboard shows live queue

**Expected Result**: All orders processed smoothly, no race conditions

## Scenario 4: GPS Accuracy Edge Case

**Actor**: Customer with poor GPS signal

1. Customer places order
2. GPS location has ±200m accuracy (poor signal)
3. System detects low accuracy
4. Falls back to manual check-in option
5. Customer manually confirms arrival
6. Order proceeds normally

**Expected Result**: Graceful fallback, no service disruption
`;

    fs.writeFileSync(path.join(baseDir, 'specs/test-scenarios.md'), scenarios);
    log('QA Engineer', `${colors.success}✓ test-scenarios.md created${colors.reset}`);
    await sleep(300);

    log('DevOps Engineer', `${colors.success}All specification files generated${colors.reset}`);
}

async function main() {
    console.clear();

    console.log(`
${colors.bright}╔════════════════════════════════════════════════════════════════════════════╗
║                         OPENSPEC WORKFLOW SIMULATION                       ║
║                    Retail Store Module Specification                      ║
║                              Basotho Medical Herbs                               ║
╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}
    `);

    await sleep(1000);

    // Initialize
    await createOpenSpecStructure();
    await sleep(500);

    // Execute all phases
    await productManagerPhase();
    await sleep(500);

    await architectPhase();
    await sleep(500);

    await frontendPhase();
    await sleep(500);

    await backendPhase();
    await sleep(500);

    await qaPhase();
    await sleep(500);

    await compliancePhase();
    await sleep(500);

    await devopsPhase();
    await sleep(500);

    await finalReview();
    await sleep(500);

    await generateSpecificationFiles();

    header('OpenSpec Workflow Complete');

    console.log(`
${colors.success}${colors.bright}✓ SPECIFICATION APPROVED AND READY${colors.reset}

All role players have collaborated successfully:
  ${roles['Product Manager'].icon} Product Manager - Requirements defined
  ${roles['Technical Architect'].icon} Technical Architect - Architecture designed
  ${roles['Frontend Developer'].icon} Frontend Developer - UI components specified
  ${roles['Backend Developer'].icon} Backend Developer - APIs documented
  ${roles['QA Engineer'].icon} QA Engineer - Test plan complete
  ${roles['Compliance Officer'].icon} Compliance Officer - Regulatory approval granted
  ${roles['DevOps Engineer'].icon} DevOps Engineer - Infrastructure ready

${colors.info}Generated Files:${colors.reset}
  📄 openspec/retail-store-module/project.md
  📄 openspec/retail-store-module/specs/main-spec.md
  📄 openspec/retail-store-module/specs/test-scenarios.md

${colors.bright}Next Phase: Begin MVP Development${colors.reset}
    `);
}

main().catch(error => {
    console.error(`${colors.error}Error:${colors.reset}`, error);
    process.exit(1);
});
