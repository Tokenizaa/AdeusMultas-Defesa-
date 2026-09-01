-- Documenso Integration Tables
-- Migration for envelope tracking, recipients, and webhook idempotency

-- Envelope tracking table
CREATE TABLE IF NOT EXISTS documenso_envelopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documenso_envelope_id TEXT UNIQUE NOT NULL,  -- env_xxx from Documenso
    external_id TEXT NOT NULL,                    -- Our case ID
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN (
        'DRAFT', 'PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'
    )),
    envelope_data JSONB NOT NULL,                 -- Full envelope snapshot
    completed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documenso_envelopes_case ON documenso_envelopes(case_id);
CREATE INDEX IF NOT EXISTS idx_documenso_envelopes_external ON documenso_envelopes(external_id);
CREATE INDEX IF NOT EXISTS idx_documenso_envelopes_status ON documenso_envelopes(status);
CREATE INDEX IF NOT EXISTS idx_documenso_envelopes_documenso_id ON documenso_envelopes(documenso_envelope_id);

-- Recipient tracking table
CREATE TABLE IF NOT EXISTS documenso_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    envelope_id UUID REFERENCES documenso_envelopes(id) ON DELETE CASCADE,
    documenso_recipient_id TEXT NOT NULL,         -- rec_xxx from Documenso
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('SIGNER', 'REVIEWER', 'APPROVER', 'RECIPIENT')),
    signing_status TEXT NOT NULL CHECK (signing_status IN (
        'NOT_SENT', 'SENT', 'NOT_OPENED', 'OPENED', 'NOT_SIGNED', 'SIGNED', 'REJECTED', 'COMPLETED'
    )),
    signing_url TEXT,
    signed_at TIMESTAMPTZ,
    read_status TEXT NOT NULL CHECK (read_status IN ('NOT_OPENED', 'OPENED', 'READ')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(envelope_id, documenso_recipient_id)
);

-- Indexes for recipient queries
CREATE INDEX IF NOT EXISTS idx_documenso_recipients_envelope ON documenso_recipients(envelope_id);
CREATE INDEX IF NOT EXISTS idx_documenso_recipients_documenso_id ON documenso_recipients(documenso_recipient_id);

-- Webhook idempotency table
CREATE TABLE IF NOT EXISTS documenso_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key TEXT UNIQUE NOT NULL,               -- env_xxx:DOCUMENT_COMPLETED
    event_type TEXT NOT NULL,
    envelope_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for idempotency lookup
CREATE INDEX IF NOT EXISTS idx_documenso_webhook_events_key ON documenso_webhook_events(event_key);
CREATE INDEX IF NOT EXISTS idx_documenso_webhook_events_envelope ON documenso_webhook_events(envelope_id);

-- Auto-cleanup old webhook events (keep 30 days)
-- Run via pg_cron or application job
COMMENT ON TABLE documenso_webhook_events IS 'Idempotency keys for webhook processing. Auto-cleanup after 30 days.';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documenso_envelopes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_documenso_envelopes_updated_at ON documenso_envelopes;
CREATE TRIGGER trigger_update_documenso_envelopes_updated_at
    BEFORE UPDATE ON documenso_envelopes
    FOR EACH ROW
    EXECUTE FUNCTION update_documenso_envelopes_updated_at();

-- RLS Policies
ALTER TABLE documenso_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenso_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenso_webhook_events ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access documenso_envelopes" ON documenso_envelopes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admin full access documenso_recipients" ON documenso_recipients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admin full access documenso_webhook_events" ON documenso_webhook_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Users can view envelopes for their cases
CREATE POLICY "User view own documenso_envelopes" ON documenso_envelopes
    FOR SELECT USING (
        case_id IN (
            SELECT id FROM cases WHERE user_id = auth.uid()
        )
    );

-- Users can view recipients for their cases' envelopes
CREATE POLICY "User view own documenso_recipients" ON documenso_recipients
    FOR SELECT USING (
        envelope_id IN (
            SELECT id FROM documenso_envelopes
            WHERE case_id IN (
                SELECT id FROM cases WHERE user_id = auth.uid()
            )
        )
    );

-- Service role can insert/update (for webhook handlers)
CREATE POLICY "Service role insert documenso_envelopes" ON documenso_envelopes
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update documenso_envelopes" ON documenso_envelopes
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Service role insert documenso_recipients" ON documenso_recipients
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update documenso_recipients" ON documenso_recipients
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Service role insert documenso_webhook_events" ON documenso_webhook_events
    FOR INSERT WITH CHECK (auth.role() = 'service_role');