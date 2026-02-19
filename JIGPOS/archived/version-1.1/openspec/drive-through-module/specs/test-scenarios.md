# Drive-Through Module - Test Scenarios

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
