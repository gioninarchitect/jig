-- ============================================================
-- JIG Craft Cannabis - Client Verification Migration
-- Adds client_documents table for B2B compliance document uploads
-- ============================================================

-- Document type enum (SA cannabis B2B requirements)
CREATE TYPE document_type AS ENUM (
  'cipc_registration',
  'tax_clearance',
  'cannabis_license',
  'id_document',
  'proof_of_address',
  'bank_confirmation',
  'bee_certificate'
);

-- Document review status
CREATE TYPE document_status AS ENUM ('pending', 'approved', 'rejected');

-- Client compliance documents
CREATE TABLE client_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    doc_type        document_type NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    file_path       VARCHAR(500) NOT NULL,
    file_size       INTEGER NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    status          document_status NOT NULL DEFAULT 'pending',
    admin_notes     TEXT,
    reviewed_by     UUID REFERENCES clients(id),
    reviewed_at     TIMESTAMPTZ,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, doc_type)  -- one doc per type per client
);

CREATE INDEX idx_client_docs_client ON client_documents (client_id);
CREATE INDEX idx_client_docs_status ON client_documents (status);
