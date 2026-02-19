# Drive-Through Module - OpenSpec Project

**Project Name**: CBD Wellness 24 - 24/7 Medical Cannabis Drive-Through Module
**Version**: 1.0.0
**Status**: Specification Phase
**Created**: 2025-11-07
**Last Updated**: 2025-11-07

## Project Overview

A modular add-on for CBD Wellness 24 enabling 24/7 drive-through service for medical cannabis and wellness products. This module integrates with the existing core platform (POS, inventory, orders, Section 21 compliance) while operating as an independent plugin that can be enabled/disabled.

## Business Context

CBD Wellness 24 operates in the regulated medical cannabis market in South Africa, requiring strict Section 21 compliance for prescription products.

**Primary Location**: Fourways, Johannesburg (Main HQ)
**Launch Site**: First drive-through will be deployed at Fourways HQ location

The drive-through module addresses:

- **24/7 Availability**: Patients requiring medication outside regular business hours
- **Privacy**: Discreet pickup for medical cannabis patients
- **Convenience**: Fast pickup for pre-ordered products
- **Compliance**: Mandatory ID verification and prescription validation at pickup
- **Safety**: Contactless transactions during health concerns
- **Scalability**: Designed for multi-location rollout after Fourways pilot success

## Product Catalog Analysis

**Total Products**: 47
**Section 21 Required**: 4 products (medical cannabis strains, THC oil)
**General Products**: 43 products (accessories, CBD, flower, pre-rolls, vapes, oils, edibles, cafe items)

**Categories**:
- Flower (lifestyle track)
- Pre-rolls
- Vapes
- Oils
- Edibles
- Accessories (pipes, grinders, papers, storage)
- Lifestyle (CBD wellness products)
- Bean & Bud (cafe menu)
- La Brewha (cafe menu)

**Price Range**: R79 - R1000

## Key Requirements

### Functional Requirements
1. Order ahead via web/mobile interface
2. Real-time queue management with estimated pickup times
3. GPS-based arrival notifications
4. Section 21 compliance verification at pickup window
5. Payment processing (pre-paid or at window)
6. Staff notification system for order preparation
7. Integration with existing inventory system
8. Order history and tracking

### Non-Functional Requirements
1. 99.9% uptime for 24/7 operation
2. Response time <2 seconds for order placement
3. GPS accuracy within 50 meters
4. Support 20 concurrent customers in queue
5. PCI DSS compliant payment processing
6. POPIA compliant patient data handling

### Compliance Requirements
1. Section 21 prescription verification for medical cannabis
2. Age verification (18+ for accessories, 21+ for cannabis)
3. ID document capture and validation
4. Audit trail for all medical cannabis transactions
5. Prescription expiry tracking
6. Quantity limits per prescription

## Stakeholder Roles

### Product Manager
**Responsibilities**:
- Define business requirements and success metrics
- Prioritize features for MVP vs future releases
- Approve specifications before development
- Validate UX flows match business objectives

### Technical Architect
**Responsibilities**:
- Design system architecture and integration points
- Define API contracts with core platform
- Specify database schema for drive-through models
- Plan scalability and performance requirements
- Review security and compliance architecture

### Frontend Developer
**Responsibilities**:
- Implement customer-facing drive-through interface
- Build staff dashboard for queue management
- Create responsive mobile-first UI
- Integrate GPS tracking and real-time updates

### Backend Developer
**Responsibilities**:
- Implement drive-through API endpoints
- Build queue management logic
- Integrate with POS and inventory systems
- Implement Section 21 compliance checks
- Set up WebSocket for real-time notifications

### QA Engineer
**Responsibilities**:
- Create test plans for all scenarios
- Verify Section 21 compliance workflows
- Test GPS accuracy and queue management
- Perform load testing for 24/7 operation
- Validate payment processing integration

### Compliance Officer
**Responsibilities**:
- Verify Section 21 regulatory compliance
- Approve ID verification workflows
- Review audit trail implementation
- Validate POPIA data handling
- Sign off on legal requirements

### DevOps Engineer
**Responsibilities**:
- Set up deployment pipeline for module
- Configure monitoring for 24/7 uptime
- Implement backup and disaster recovery
- Manage environment configurations

## Success Metrics

### Business Metrics (Revenue & Volume)
1. **Order Volume Targets**:
   - **Month 1-2**: 100-150 orders/day (baseline establishment)
   - **Month 3-6**: 150-200 orders/day (target threshold)
   - **Month 6+**: 200-250 orders/day (stretch goal)
   - **Peak Days** (weekends/holidays): 300+ orders/day

   *Industry benchmark: Leading dispensaries with drive-through report 200+ orders on peak days with 70% of customers using drive-through service*

2. **Revenue Targets** (based on R150 average basket):
   - **Conservative** (150 orders/day): R22,500/day = R675,000/month
   - **Target** (200 orders/day): R30,000/day = R900,000/month
   - **Stretch** (250 orders/day): R37,500/day = R1,125,000/month

3. **Customer Satisfaction**: 4.5+ star rating minimum
4. **Customer Retention**: 60% repeat customers within 30 days

### Operational Metrics (Performance)
5. **Average Pickup Time**: <5 minutes from arrival to departure
6. **Staff Efficiency**: <2 minutes average order preparation time
7. **Queue Management**: Support 30+ concurrent customers without degradation
8. **Order Accuracy**: 99.5% correct orders (no missing items)

### Technical Metrics (Reliability)
9. **Uptime**: 99.9% availability (24/7 operation)
10. **API Response Time**: <2 seconds for order placement, <500ms for queue updates
11. **GPS Accuracy**: ±50 meters for arrival detection
12. **Real-time Updates**: WebSocket latency <200ms

### Compliance Metrics (Regulatory)
13. **Section 21 Verification**: 100% compliance rate (ZERO tolerance)
14. **Audit Trail**: 100% complete records for medical cannabis transactions
15. **Failed Verification Handling**: 0 medical cannabis handovers without valid prescription
16. **Data Security**: POPIA compliance 100%, no data breaches

## Integration Points

### Core Platform Dependencies
1. **Product API** (`/api/v1/products`) - Inventory availability
2. **Orders API** (`/api/v1/orders`) - Order creation and status
3. **Section21 API** (`/api/v1/section21`) - Prescription validation
4. **Payment API** (`/api/v1/payment`) - InstaPay WebPay V2 integration + Manual EFT
5. **User API** (`/api/v1/users`) - Customer authentication
6. **MongoDB** (`cbdwellness24` database) - Data persistence

### New Components Required
1. **DriveThrough API** - Queue management and order routing
2. **GPS Service** - Location tracking and geofencing
3. **Notification Service** - SMS/Push for order status updates
4. **Staff Dashboard** - Queue monitoring and fulfillment
5. **Customer Portal** - Order placement and tracking

## Technical Stack

**Backend**: Node.js/Express (existing)
**Database**: MongoDB (existing `cbdwellness24` database)
**Real-time**: Socket.io for live queue updates via WebSocket
**GPS**: Google Maps JavaScript API for location tracking
**Notifications**: Twilio SMS (existing), Push via Firebase
**Payment**: InstaPay WebPay V2 (South Africa) + Manual EFT fallback
**Authentication**: JWT (existing auth system)
**Caching**: Redis for queue state and session management

## Project Timeline

**Phase 1: Specification & Design** (Current - Week 1)
- Complete OpenSpec documentation with all roles
- Get stakeholder approval on specifications
- Finalize technical architecture

**Phase 2: MVP Development** (Week 2-4)
- Core drive-through ordering flow
- Basic queue management
- Section 21 compliance integration
- Staff dashboard

**Phase 3: Enhanced Features** (Week 5-6)
- GPS tracking and arrival notifications (Fourways coordinates)
- Real-time queue updates via WebSocket
- Order history and tracking
- Customer notifications (SMS/Push)

**Phase 4: Testing & Launch** (Week 7)
- QA testing all scenarios at Fourways location
- Load testing for 24/7 operation (150-200 orders/day target)
- Compliance review and sign-off
- Production deployment at Fourways HQ

**Phase 5: Multi-Location Rollout** (Post-Launch)
- Monitor Fourways performance for 3 months
- Optimize based on real-world data
- Prepare for additional branch deployments

## Risks & Mitigation

1. **Risk**: Section 21 compliance failures
   **Mitigation**: Compliance officer review at spec phase, automated validation rules

2. **Risk**: GPS accuracy issues
   **Mitigation**: Fallback to manual check-in, geofencing tolerance

3. **Risk**: 24/7 uptime challenges
   **Mitigation**: Comprehensive monitoring, on-call rotation, disaster recovery plan

4. **Risk**: Integration breaking changes to core platform
   **Mitigation**: Versioned API contracts, thorough integration testing

5. **Risk**: Payment processing failures at pickup
   **Mitigation**: Offline payment mode, multiple payment methods, clear error handling

## Next Steps

1. Complete detailed specification document (specs/main-spec.md)
2. Create scenarios for all user flows (specs/scenarios/)
3. Get Product Manager approval on business requirements
4. Get Technical Architect approval on integration design
5. Get Compliance Officer approval on Section 21 workflows
6. Begin development only after all stakeholder sign-offs
