-- ========================================================================
-- TAXI MANAGEMENT SYSTEM "OSTBAHNHOF" - MULTI-TENANT SCHEMA
-- BOKraft-konforme Münchner Taxitarif-Engine
-- ========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ========================================================================
-- 1. TENANTS (Mandanten/Firmen)
-- ========================================================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL, -- z.B. "ostbahnhof", "mtz", "taxi-muenchen"
    name VARCHAR(100) NOT NULL,
    legal_name VARCHAR(200),
    
    -- Kontaktdaten
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(200),
    
    -- Adresse
    street VARCHAR(200),
    zip_code VARCHAR(10),
    city VARCHAR(100),
    
    -- Steuerdaten
    vat_id VARCHAR(50),
    tax_number VARCHAR(50),
    
    -- Bankverbindung
    bank_name VARCHAR(100),
    iban VARCHAR(34),
    bic VARCHAR(11),
    
    -- Branding (URLs zu Logos)
    logo_light_url TEXT,
    logo_dark_url TEXT,
    favicon_url TEXT,
    
    -- Konfiguration
    config JSONB DEFAULT '{}'::jsonb,
    
    -- Aktivierungsstatus
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    -- Tarif-Konfiguration (Münchner Tarif als Default)
    pricing_config JSONB DEFAULT '{
        "base_fare": 5.90,
        "km_rate": 2.70,
        "waiting_rate_per_hour": 39.00,
        "surcharge_5plus_passengers": 10.00,
        "surcharge_bicycle": 7.50,
        "fixed_prices": {
            "airport_messe": 94.00,
            "hbf_airport": 106.00,
            "hbf_messe": 43.00
        }
    }'::jsonb,
    
    -- Telegram Konfiguration
    telegram_bot_token_encrypted TEXT,
    telegram_group_id BIGINT,
    
    -- Gebührenkonfiguration
    brokerage_fee_percent DECIMAL(5,2) DEFAULT 5.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Mandanten-Abfragen
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_active ON tenants(is_active);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================================================
-- 2. DRIVERS (Fahrer)
-- ========================================================================
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Persönliche Daten
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    
    -- Lizenz & Fahrzeug
    license_number VARCHAR(50),
    vehicle_plate VARCHAR(20),
    vehicle_type VARCHAR(50) DEFAULT 'standard', -- standard, xl, luxury
    
    -- Telegram Integration
    telegram_user_id BIGINT UNIQUE,
    telegram_username VARCHAR(100),
    telegram_chat_id BIGINT,
    telegram_verified_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT false,
    last_location GEOGRAPHY(POINT, 4326),
    last_location_at TIMESTAMPTZ,
    
    -- Finanzen
    current_balance DECIMAL(10,2) DEFAULT 0.00, -- Schulden bei negativem Wert
    total_earnings DECIMAL(12,2) DEFAULT 0.00,
    total_brokerage_fees DECIMAL(10,2) DEFAULT 0.00,
    
    -- Bankverbindung für Auszahlungen
    bank_account_holder VARCHAR(200),
    bank_iban VARCHAR(34),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drivers_tenant ON drivers(tenant_id);
CREATE INDEX idx_drivers_telegram ON drivers(telegram_user_id);
CREATE INDEX idx_drivers_available ON drivers(tenant_id, is_available) WHERE is_available = true;

CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================================================
-- 3. BOOKINGS (Fahrten/Buchungen)
-- ========================================================================
CREATE TYPE booking_status AS ENUM (
    'pending',           -- Warte auf Zuweisung
    'telegram_broadcast', -- In Telegram-Gruppe gepostet
    'claimed',           -- Von Fahrer angenommen
    'assigned_manual',   -- Manuell durch Backoffice zugewiesen
    'confirmed',         -- Bestätigt
    'in_progress',       -- Fahrt läuft
    'completed',         -- Abgeschlossen
    'cancelled',         -- Storniert
    'no_show'           -- Kunde nicht erschienen
);

CREATE TYPE vehicle_type AS ENUM ('standard', 'xl', 'luxury', 'wheelchair');

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Buchungsnummer (menschlich lesbar)
    booking_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- Status
    status booking_status DEFAULT 'pending',
    
    -- Zeit
    pickup_datetime TIMESTAMPTZ NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Kundendaten (VERSCHLÜSSELT bei Bedarf)
    customer_name VARCHAR(200),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(100),
    
    -- Adressen
    pickup_address TEXT NOT NULL,
    pickup_lat DECIMAL(10, 8),
    pickup_lng DECIMAL(11, 8),
    pickup_district VARCHAR(100), -- Stadtteil (für anonyme Anzeige)
    
    destination_address TEXT,
    destination_lat DECIMAL(10, 8),
    destination_lng DECIMAL(11, 8),
    
    -- Fahrtdetails
    vehicle_type vehicle_type DEFAULT 'standard',
    passenger_count INTEGER DEFAULT 1,
    has_bicycle BOOLEAN DEFAULT false,
    has_luggage BOOLEAN DEFAULT false,
    
    -- Preiskalkulation (detailliert für BOKraft)
    distance_km DECIMAL(6, 2),
    estimated_duration_min INTEGER,
    
    -- Preisbestandteile (getrennt gespeichert)
    price_base_fare DECIMAL(8, 2) DEFAULT 0,      -- Grundpreis
    price_distance_fare DECIMAL(8, 2) DEFAULT 0,  -- Kilometerpreis
    price_waiting_fare DECIMAL(8, 2) DEFAULT 0,   -- Wartezeit
    price_surcharges DECIMAL(8, 2) DEFAULT 0,     -- Zuschläge
    price_fixed_fare DECIMAL(8, 2) DEFAULT 0,     -- Festpreis (wenn anwendbar)
    price_total DECIMAL(8, 2) NOT NULL,           -- Gesamtpreis
    
    -- Festpreis-Route (falls anwendbar)
    fixed_route_type VARCHAR(50), -- 'airport_messe', 'hbf_airport', 'hbf_messe'
    
    -- Zahlung
    payment_method VARCHAR(20) DEFAULT 'cash', -- cash, card, invoice
    needs_invoice BOOLEAN DEFAULT false,
    invoice_company VARCHAR(200),
    invoice_vat_id VARCHAR(50),
    invoice_address TEXT,
    
    -- Zuweisung
    assigned_driver_id UUID REFERENCES drivers(id),
    assigned_at TIMESTAMPTZ,
    assigned_by UUID, -- User ID des Admins (falls manuell)
    assignment_type VARCHAR(20), -- 'telegram', 'manual'
    
    -- Telegram-spezifisch
    telegram_message_id BIGINT,
    telegram_claimed_at TIMESTAMPTZ,
    telegram_claimed_by_driver_id UUID REFERENCES drivers(id),
    
    -- Notizen
    customer_notes TEXT,
    internal_notes TEXT,
    
    -- Vermittlungsgebühr (5% bei Telegram-Annahme)
    brokerage_fee_amount DECIMAL(8, 2) DEFAULT 0,
    brokerage_fee_paid BOOLEAN DEFAULT false,
    brokerage_fee_paid_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_pickup_datetime ON bookings(pickup_datetime);
CREATE INDEX idx_bookings_driver ON bookings(assigned_driver_id);
CREATE INDEX idx_bookings_tenant_status ON bookings(tenant_id, status);
CREATE INDEX idx_bookings_telegram_msg ON bookings(telegram_message_id);

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================================================
-- 4. AUDIT_LOGS (Strikte Nachvollziehbarkeit)
-- ========================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Wer hat was getan
    actor_type VARCHAR(20) NOT NULL, -- 'driver', 'admin', 'system', 'telegram_bot'
    actor_id UUID, -- Driver ID oder Admin User ID
    actor_name VARCHAR(200),
    
    -- Was wurde geändert
    action VARCHAR(50) NOT NULL, -- e.g., 'booking_status_changed', 'price_updated', 'driver_claimed'
    entity_type VARCHAR(50) NOT NULL, -- 'booking', 'driver', 'tenant'
    entity_id UUID NOT NULL,
    
    -- Details
    old_values JSONB,
    new_values JSONB,
    metadata JSONB, -- Zusätzliche Kontextdaten
    
    -- IP und User-Agent für Sicherheit
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ========================================================================
-- 5. BROKERAGE_FEES (Vermittlungsgebühren-Tracking)
-- ========================================================================
CREATE TABLE brokerage_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    
    -- Gebührendetails
    fee_amount DECIMAL(8, 2) NOT NULL,
    fee_percent DECIMAL(5, 2) NOT NULL,
    
    -- Buchungsbetrag (zur Referenz)
    booking_total DECIMAL(8, 2) NOT NULL,
    
    -- Status
    is_paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMPTZ,
    paid_by UUID, -- Admin User ID
    
    -- Abrechnungsperiode
    billing_period VARCHAR(7), -- Format: YYYY-MM
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_brokerage_fees_tenant ON brokerage_fees(tenant_id);
CREATE INDEX idx_brokerage_fees_driver ON brokerage_fees(driver_id);
CREATE INDEX idx_brokerage_fees_booking ON brokerage_fees(booking_id);
CREATE INDEX idx_brokerage_fees_paid ON brokerage_fees(is_paid);
CREATE INDEX idx_brokerage_fees_period ON brokerage_fees(billing_period);

CREATE TRIGGER update_brokerage_fees_updated_at
    BEFORE UPDATE ON brokerage_fees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================================================
-- 6. ADMIN USERS (Backoffice-Benutzer)
-- ========================================================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Rollen
    role VARCHAR(20) DEFAULT 'operator', -- 'super_admin', 'admin', 'operator', 'accountant'
    permissions JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_users_tenant ON admin_users(tenant_id);
CREATE INDEX idx_admin_users_email ON admin_users(email);

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================================================
-- 7. VIEWS (Hilfsansichten)
-- ========================================================================

-- Offene Vermittlungsgebühren pro Fahrer
CREATE VIEW driver_brokerage_debts AS
SELECT 
    d.id as driver_id,
    d.tenant_id,
    d.first_name,
    d.last_name,
    COALESCE(SUM(bf.fee_amount), 0) as total_fees,
    COALESCE(SUM(CASE WHEN bf.is_paid THEN bf.fee_amount ELSE 0 END), 0) as paid_fees,
    COALESCE(SUM(CASE WHEN NOT bf.is_paid THEN bf.fee_amount ELSE 0 END), 0) as outstanding_fees,
    COUNT(CASE WHEN NOT bf.is_paid THEN 1 END) as unpaid_bookings
FROM drivers d
LEFT JOIN brokerage_fees bf ON d.id = bf.driver_id
GROUP BY d.id, d.tenant_id, d.first_name, d.last_name;

-- Buchungsübersicht mit allen Details
CREATE VIEW booking_overview AS
SELECT 
    b.*,
    d.first_name as driver_first_name,
    d.last_name as driver_last_name,
    d.phone as driver_phone,
    CASE 
        WHEN b.status IN ('completed', 'cancelled', 'no_show') THEN 'closed'
        WHEN b.status IN ('in_progress') THEN 'active'
        ELSE 'open'
    END as booking_state
FROM bookings b
LEFT JOIN drivers d ON b.assigned_driver_id = d.id;

-- ========================================================================
-- 8. FUNCTIONS (Hilfsfunktionen)
-- ========================================================================

-- Funktion zum Generieren der Buchungsnummer
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    sequence_num INTEGER;
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YY');
    
    -- Zähle Buchungen des aktuellen Jahres für diesen Mandanten
    SELECT COUNT(*) + 1 INTO sequence_num
    FROM bookings
    WHERE tenant_id = NEW.tenant_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    
    NEW.booking_number := year_prefix || '-' || LPAD(sequence_num::TEXT, 6, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_number
    BEFORE INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION generate_booking_number();

-- Funktion zum Loggen von Änderungen
CREATE OR REPLACE FUNCTION log_booking_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (
            tenant_id,
            actor_type,
            actor_id,
            action,
            entity_type,
            entity_id,
            old_values,
            new_values
        ) VALUES (
            NEW.tenant_id,
            COALESCE(current_setting('app.current_actor_type', true), 'system'),
            NULLIF(current_setting('app.current_actor_id', true), '')::UUID,
            'booking_updated',
            'booking',
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_booking_changes
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION log_booking_change();

-- ========================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ========================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brokerage_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policies für Multi-Tenant Isolation
CREATE POLICY tenant_isolation ON tenants
    FOR ALL USING (id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY driver_tenant_isolation ON drivers
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY booking_tenant_isolation ON bookings
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY audit_tenant_isolation ON audit_logs
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY brokerage_tenant_isolation ON brokerage_fees
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY admin_tenant_isolation ON admin_users
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ========================================================================
-- 10. SEED DATA (Beispiel-Mandant)
-- ========================================================================

INSERT INTO tenants (
    slug,
    name,
    legal_name,
    phone,
    email,
    street,
    zip_code,
    city,
    vat_id,
    tax_number,
    config
) VALUES (
    'ostbahnhof',
    'Taxi Center Ostbahnhof',
    'Taxi Center Ostbahnhof GmbH',
    '+49 89 12345678',
    'info@taxi-ostbahnhof.de',
    'Bahnhofplatz 1',
    '80335',
    'München',
    'DE123456789',
    '123/456/78901',
    '{
        "theme": {
            "primary_color": "#F4C430",
            "secondary_color": "#1a1a1a"
        },
        "services": [
            "airport",
            "messe",
            "courier",
            "medical"
        ]
    }'::jsonb
);
