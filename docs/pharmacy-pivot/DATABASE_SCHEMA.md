# Origin Retail Pharmacy Pivot Database Schema

Target module: Origin Retail, currently stored in legacy folder `JIGPOS/newbrand`.

Boundary: do not apply this schema blindly to `tnt-za`. TNT-ZA is the main track-and-trace / EU GMP QMS system and has its own data model.

Section 21 boundary: retain the existing Section 21 workflow. Pharmacy tables add pickup and dispensing partner controls; they do not replace patient eligibility, prescription, or authorization checks.

## Core Tables

### `patients`

- `id UUID PRIMARY KEY`
- `email VARCHAR(255) UNIQUE`
- `phone VARCHAR(50)`
- `first_name VARCHAR(255)`
- `last_name VARCHAR(255)`
- `id_number_hash VARCHAR(255)`
- `date_of_birth DATE`
- `medical_profile_id UUID NULL`
- `section21_status VARCHAR(50) NULL`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

### `partner_pharmacies`

- `id UUID PRIMARY KEY`
- `facility_name VARCHAR(255) NOT NULL`
- `pharmacy_registration_number VARCHAR(100)`
- `license_number VARCHAR(100)`
- `license_expiry DATE`
- `responsible_pharmacist_name VARCHAR(255)`
- `responsible_pharmacist_email VARCHAR(255)`
- `responsible_pharmacist_registration VARCHAR(100)`
- `contact_email VARCHAR(255)`
- `contact_phone VARCHAR(50)`
- `address_street VARCHAR(255)`
- `address_city VARCHAR(100)`
- `address_province VARCHAR(100)`
- `address_postal_code VARCHAR(20)`
- `address_country VARCHAR(50) DEFAULT 'South Africa'`
- `handling_fee_type pharmacy_fee_type`
- `handling_fee_value NUMERIC(10,2) NOT NULL`
- `vault_status BOOLEAN DEFAULT TRUE`
- `status pharmacy_status DEFAULT 'onboarding'`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

### `pharmacy_users`

- `id UUID PRIMARY KEY`
- `pharmacy_id UUID REFERENCES partner_pharmacies(id)`
- `email VARCHAR(255) NOT NULL UNIQUE`
- `name VARCHAR(255) NOT NULL`
- `role pharmacy_user_role NOT NULL`
- `registration_number VARCHAR(100)`
- `can_scan_arrivals BOOLEAN DEFAULT FALSE`
- `can_release_collections BOOLEAN DEFAULT FALSE`
- `can_mark_returns BOOLEAN DEFAULT FALSE`
- `can_view_settlements BOOLEAN DEFAULT FALSE`
- `active BOOLEAN DEFAULT TRUE`
- `last_login_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

### `pharmacy_onboarding_documents`

- `id UUID PRIMARY KEY`
- `pharmacy_id UUID REFERENCES partner_pharmacies(id)`
- `doc_type pharmacy_document_type NOT NULL`
- `file_name VARCHAR(255)`
- `file_path VARCHAR(500)`
- `file_size INTEGER`
- `mime_type VARCHAR(100)`
- `status document_status DEFAULT 'pending'`
- `expiry_date DATE`
- `reviewed_by UUID NULL`
- `reviewed_at TIMESTAMPTZ`
- `admin_notes TEXT`
- `uploaded_at TIMESTAMPTZ`

## Order Extensions

Add to `orders`:

- `patient_id UUID NULL`
- `pharmacy_id UUID REFERENCES partner_pharmacies(id)`
- `section21_document_ref VARCHAR(100)`
- `prescription_reference VARCHAR(100)`
- `prescriber_reference VARCHAR(100)`
- `section21_verified BOOLEAN`
- `dispensing_partner_confirmed BOOLEAN`
- `consultation_fee NUMERIC(10,2) DEFAULT 0`
- `medication_total NUMERIC(10,2) DEFAULT 0`
- `pharmacy_handling_fee_estimate NUMERIC(10,2)`
- `gateway_payment_reference VARCHAR(255)`
- `arrived_at_pharmacy_at TIMESTAMPTZ`
- `collected_at TIMESTAMPTZ`
- `uncollected_expired_at TIMESTAMPTZ`
- `returned_to_hub_at TIMESTAMPTZ`
- `collection_otp_hash VARCHAR(255)`
- `collection_otp_expires_at TIMESTAMPTZ`

Add to `order_items`:

- `batch_number VARCHAR(100)`
- `lot_number VARCHAR(100)`
- `expiry_date DATE`
- `packed_inventory_movement_id UUID`
- `returned_inventory_movement_id UUID`

### `order_status_events`

- `id UUID PRIMARY KEY`
- `order_id VARCHAR(20) REFERENCES orders(id)`
- `from_status VARCHAR(50)`
- `to_status VARCHAR(50)`
- `reason_code VARCHAR(100)`
- `actor_type VARCHAR(50)`
- `actor_id VARCHAR(100)`
- `metadata JSONB`
- `created_at TIMESTAMPTZ`

## Payment Tables

### `payment_events`

- `id UUID PRIMARY KEY`
- `order_id VARCHAR(20) REFERENCES orders(id)`
- `gateway VARCHAR(50)`
- `gateway_reference VARCHAR(255)`
- `event_type payment_event_type`
- `amount NUMERIC(12,2)`
- `currency VARCHAR(3) DEFAULT 'ZAR'`
- `raw_payload JSONB`
- `created_at TIMESTAMPTZ`

### `payment_allocations`

- `id UUID PRIMARY KEY`
- `order_id VARCHAR(20) REFERENCES orders(id)`
- `payment_event_id UUID REFERENCES payment_events(id)`
- `allocation_type payment_allocation_type`
- `amount NUMERIC(12,2)`
- `created_at TIMESTAMPTZ`

## Inventory Tables

### `inventory_batches`

- `id UUID PRIMARY KEY`
- `product_id UUID REFERENCES products(id)`
- `batch_number VARCHAR(100) NOT NULL`
- `lot_number VARCHAR(100)`
- `expiry_date DATE`
- `quantity_on_hand NUMERIC(12,3) NOT NULL`
- `quantity_reserved NUMERIC(12,3) DEFAULT 0`
- `status inventory_batch_status DEFAULT 'available'`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

### `inventory_movements`

- `id UUID PRIMARY KEY`
- `product_id UUID REFERENCES products(id)`
- `inventory_batch_id UUID REFERENCES inventory_batches(id)`
- `order_id VARCHAR(20) REFERENCES orders(id)`
- `order_item_id UUID REFERENCES order_items(id)`
- `package_id UUID`
- `movement_type inventory_movement_type`
- `quantity_delta NUMERIC(12,3) NOT NULL`
- `balance_after NUMERIC(12,3) NOT NULL`
- `reason_code VARCHAR(100)`
- `performed_by VARCHAR(100)`
- `source_system VARCHAR(50)`
- `created_at TIMESTAMPTZ`

## Package Tables

### `order_packages`

- `id UUID PRIMARY KEY`
- `order_id VARCHAR(20) REFERENCES orders(id)`
- `package_code VARCHAR(100) UNIQUE`
- `qr_payload TEXT`
- `status package_status`
- `sealed_by VARCHAR(100)`
- `sealed_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

### `package_custody_events`

- `id UUID PRIMARY KEY`
- `package_id UUID REFERENCES order_packages(id)`
- `event_type package_custody_event_type`
- `actor_type VARCHAR(50)`
- `actor_id VARCHAR(100)`
- `location_type VARCHAR(50)`
- `location_id VARCHAR(100)`
- `scan_payload TEXT`
- `metadata JSONB`
- `created_at TIMESTAMPTZ`

## Pharmacy Finance Tables

### `pharmacy_ledger`

- `id UUID PRIMARY KEY`
- `pharmacy_id UUID REFERENCES partner_pharmacies(id)`
- `order_id VARCHAR(20) REFERENCES orders(id)`
- `package_id UUID REFERENCES order_packages(id)`
- `action_type pharmacy_ledger_action`
- `fee_earned NUMERIC(10,2) NOT NULL`
- `action_timestamp TIMESTAMPTZ NOT NULL`
- `performed_by VARCHAR(100)`
- `payout_status pharmacy_payout_status DEFAULT 'ACCRUED'`
- `settlement_id UUID`
- `reversal_of UUID REFERENCES pharmacy_ledger(id)`
- `created_at TIMESTAMPTZ`

### `pharmacy_settlements`

- `id UUID PRIMARY KEY`
- `settlement_number VARCHAR(50) UNIQUE`
- `pharmacy_id UUID REFERENCES partner_pharmacies(id)`
- `period_start DATE`
- `period_end DATE`
- `gross_fee_total NUMERIC(12,2)`
- `return_fee_total NUMERIC(12,2)`
- `adjustment_total NUMERIC(12,2)`
- `net_payable NUMERIC(12,2)`
- `status settlement_status DEFAULT 'draft'`
- `paid_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ`

### `refunds_payable`

- `id UUID PRIMARY KEY`
- `order_id VARCHAR(20) REFERENCES orders(id)`
- `payment_event_id UUID REFERENCES payment_events(id)`
- `patient_id UUID NULL`
- `amount NUMERIC(12,2) NOT NULL`
- `reason_code refund_reason_code`
- `status refund_payable_status DEFAULT 'pending'`
- `credit_note_number VARCHAR(50)`
- `linked_payment_reference VARCHAR(255)`
- `created_at TIMESTAMPTZ`
- `approved_at TIMESTAMPTZ`
- `paid_at TIMESTAMPTZ`

## Logistics and Audit Tables

### `return_waybills`

- `id UUID PRIMARY KEY`
- `order_id VARCHAR(20) REFERENCES orders(id)`
- `package_id UUID REFERENCES order_packages(id)`
- `pharmacy_id UUID REFERENCES partner_pharmacies(id)`
- `waybill_number VARCHAR(100)`
- `courier_name VARCHAR(100)`
- `status return_waybill_status`
- `requested_at TIMESTAMPTZ`
- `received_at_hub_at TIMESTAMPTZ`
- `created_by VARCHAR(100)`
- `metadata JSONB`

### `workflow_tickets`

- `id UUID PRIMARY KEY`
- `ticket_type workflow_ticket_type`
- `entity_type VARCHAR(100)`
- `entity_id VARCHAR(100)`
- `priority ticket_priority`
- `status ticket_status`
- `assigned_role VARCHAR(100)`
- `assigned_user_id VARCHAR(100)`
- `due_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ`
- `resolved_at TIMESTAMPTZ`

### `audit_events`

- `id UUID PRIMARY KEY`
- `entity_type VARCHAR(100)`
- `entity_id VARCHAR(100)`
- `event_type VARCHAR(100)`
- `actor_type VARCHAR(50)`
- `actor_id VARCHAR(100)`
- `before_state JSONB`
- `after_state JSONB`
- `metadata JSONB`
- `request_id VARCHAR(100)`
- `ip_address VARCHAR(45)`
- `created_at TIMESTAMPTZ`

## Immutability Controls

Production should block `UPDATE` and `DELETE` on these tables except through tightly controlled service accounts or append-only corrections:

- `payment_events`
- `payment_allocations`
- `inventory_movements`
- `package_custody_events`
- `pharmacy_ledger`
- `order_status_events`
- `audit_events`

Corrections must be new linked rows, not mutations of history.
