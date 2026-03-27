-- =============================================================================
-- TAXI CENTER OSTBAHNHOF - KOMPLETTES DATABASE SETUP
-- Führt Schema + Daten in einer Datei aus
-- =============================================================================

-- =============================================================================
-- TEIL 1: SCHEMA ERSTELLEN (aus 001_initial_schema.sql)
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. TENANTS (Mandanten/Firmen)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    legal_name VARCHAR(200),
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(200),
    street VARCHAR(200),
    zip_code VARCHAR(10),
    city VARCHAR(100),
    vat_id VARCHAR(50),
    tax_number VARCHAR(50),
    bank_name VARCHAR(100),
    iban VARCHAR(34),
    bic VARCHAR(11),
    logo_light_url TEXT,
    logo_dark_url TEXT,
    favicon_url TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
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
    telegram_bot_token_encrypted TEXT,
    telegram_group_id BIGINT,
    brokerage_fee_percent DECIMAL(5,2) DEFAULT 5.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DRIVERS (Fahrer)
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    license_number VARCHAR(50),
    vehicle_plate VARCHAR(20),
    vehicle_type VARCHAR(50) DEFAULT 'standard',
    telegram_user_id BIGINT UNIQUE,
    telegram_username VARCHAR(100),
    telegram_chat_id BIGINT,
    telegram_verified_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT false,
    last_location GEOGRAPHY(POINT, 4326),
    last_location_at TIMESTAMPTZ,
    current_balance DECIMAL(10,2) DEFAULT 0.00,
    total_earnings DECIMAL(12,2) DEFAULT 0.00,
    total_brokerage_fees DECIMAL(10,2) DEFAULT 0.00,
    bank_account_holder VARCHAR(200),
    bank_iban VARCHAR(34),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BOOKINGS (Fahrten/Buchungen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM (
            'pending', 'telegram_broadcast', 'claimed', 'assigned_manual', 
            'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_number VARCHAR(20) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    pickup_datetime TIMESTAMPTZ NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    customer_name VARCHAR(200),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(100),
    pickup_address TEXT NOT NULL,
    pickup_lat DECIMAL(10, 8),
    pickup_lng DECIMAL(11, 8),
    pickup_district VARCHAR(100),
    destination_address TEXT,
    destination_lat DECIMAL(10, 8),
    destination_lng DECIMAL(11, 8),
    vehicle_type VARCHAR(50) DEFAULT 'standard',
    passenger_count INTEGER DEFAULT 1,
    has_bicycle BOOLEAN DEFAULT false,
    has_luggage BOOLEAN DEFAULT false,
    distance_km DECIMAL(6, 2),
    estimated_duration_min INTEGER,
    price_base_fare DECIMAL(8, 2) DEFAULT 0,
    price_distance_fare DECIMAL(8, 2) DEFAULT 0,
    price_waiting_fare DECIMAL(8, 2) DEFAULT 0,
    price_surcharges DECIMAL(8, 2) DEFAULT 0,
    price_fixed_fare DECIMAL(8, 2),
    price_total DECIMAL(8, 2) NOT NULL,
    fixed_route_type VARCHAR(50),
    payment_method VARCHAR(20) DEFAULT 'cash',
    needs_invoice BOOLEAN DEFAULT false,
    invoice_company VARCHAR(200),
    invoice_vat_id VARCHAR(50),
    invoice_address TEXT,
    assigned_driver_id UUID REFERENCES drivers(id),
    assigned_at TIMESTAMPTZ,
    assigned_by UUID,
    assignment_type VARCHAR(20),
    telegram_message_id BIGINT,
    telegram_claimed_at TIMESTAMPTZ,
    telegram_claimed_by_driver_id UUID REFERENCES drivers(id),
    customer_notes TEXT,
    internal_notes TEXT,
    brokerage_fee_amount DECIMAL(8, 2) DEFAULT 0,
    brokerage_fee_paid BOOLEAN DEFAULT false,
    brokerage_fee_paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AUDIT_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    actor_type VARCHAR(20) NOT NULL,
    actor_id UUID,
    actor_name VARCHAR(200),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BROKERAGE_FEES
CREATE TABLE IF NOT EXISTS brokerage_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    fee_amount DECIMAL(8, 2) NOT NULL,
    fee_percent DECIMAL(5, 2) NOT NULL,
    booking_total DECIMAL(8, 2) NOT NULL,
    is_paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMPTZ,
    paid_by UUID,
    billing_period VARCHAR(7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ADMIN_USERS
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'operator',
    permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGER für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brokerage_fees_updated_at ON brokerage_fees;
CREATE TRIGGER update_brokerage_fees_updated_at
    BEFORE UPDATE ON brokerage_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- INDEXE
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_drivers_tenant ON drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_telegram ON drivers(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_brokerage_fees_tenant ON brokerage_fees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brokerage_fees_driver ON brokerage_fees(driver_id);

-- VIEWS
DROP VIEW IF EXISTS driver_brokerage_debts;
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

DROP VIEW IF EXISTS booking_overview;
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

-- Buchungsnummer Generator
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    sequence_num INTEGER;
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YY');
    SELECT COUNT(*) + 1 INTO sequence_num
    FROM bookings
    WHERE tenant_id = NEW.tenant_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    NEW.booking_number := year_prefix || '-' || LPAD(sequence_num::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_booking_number ON bookings;
CREATE TRIGGER set_booking_number
    BEFORE INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION generate_booking_number();

-- =============================================================================
-- TEIL 2: FUNKTIONEN ERSTELLEN (aus 002_functions.sql)
-- =============================================================================

CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_actor_context(p_actor_type VARCHAR(20), p_actor_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_actor_type', p_actor_type, FALSE);
    PERFORM set_config('app.current_actor_id', COALESCE(p_actor_id::TEXT, ''), FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION claim_booking(p_booking_id UUID, p_driver_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_tenant_id UUID;
    v_current_status VARCHAR(50);
    v_booking_total DECIMAL(8,2);
    v_brokerage_fee DECIMAL(8,2);
BEGIN
    SELECT tenant_id, status, price_total, tenant_id
    INTO v_tenant_id, v_current_status, v_booking_total, v_tenant_id
    FROM bookings WHERE id = p_booking_id FOR UPDATE NOWAIT;
    
    IF v_current_status != 'telegram_broadcast' THEN
        RAISE EXCEPTION 'Buchung ist nicht mehr verfuegbar. Status: %', v_current_status;
    END IF;
    
    v_brokerage_fee := ROUND(v_booking_total * 0.05, 2);
    
    UPDATE bookings SET 
        status = 'claimed',
        assigned_driver_id = p_driver_id,
        assignment_type = 'telegram',
        telegram_claimed_at = NOW(),
        telegram_claimed_by_driver_id = p_driver_id,
        brokerage_fee_amount = v_brokerage_fee,
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    INSERT INTO brokerage_fees (tenant_id, booking_id, driver_id, fee_amount, fee_percent, booking_total, billing_period)
    VALUES (v_tenant_id, p_booking_id, p_driver_id, v_brokerage_fee, 5.00, v_booking_total, TO_CHAR(NOW(), 'YYYY-MM'));
    
    UPDATE drivers SET 
        total_brokerage_fees = total_brokerage_fees + v_brokerage_fee,
        current_balance = current_balance - v_brokerage_fee,
        updated_at = NOW()
    WHERE id = p_driver_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN NO_DATA_FOUND THEN RAISE EXCEPTION 'Buchung nicht gefunden';
    WHEN lock_not_available THEN RAISE EXCEPTION 'Buchung wird gerade bearbeitet';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION assign_booking_manual(p_booking_id UUID, p_driver_id UUID, p_assigned_by UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_tenant_id UUID;
    v_current_status VARCHAR(50);
BEGIN
    SELECT tenant_id, status INTO v_tenant_id, v_current_status
    FROM bookings WHERE id = p_booking_id FOR UPDATE;
    
    IF v_current_status IN ('completed', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Buchung kann nicht zugewiesen werden. Status: %', v_current_status;
    END IF;
    
    UPDATE bookings SET 
        status = 'assigned_manual',
        assigned_driver_id = p_driver_id,
        assigned_by = p_assigned_by,
        assigned_at = NOW(),
        assignment_type = 'manual',
        brokerage_fee_amount = 0,
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION broadcast_to_telegram(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_tenant_id UUID;
    v_current_status VARCHAR(50);
    v_telegram_group_id BIGINT;
BEGIN
    SELECT b.tenant_id, b.status, t.telegram_group_id
    INTO v_tenant_id, v_current_status, v_telegram_group_id
    FROM bookings b JOIN tenants t ON b.tenant_id = t.id WHERE b.id = p_booking_id;
    
    IF v_current_status != 'pending' THEN
        RAISE EXCEPTION 'Buchung muss im Status pending sein. Aktuell: %', v_current_status;
    END IF;
    
    IF v_telegram_group_id IS NULL THEN
        RAISE EXCEPTION 'Keine Telegram-Gruppe fuer diesen Mandanten konfiguriert';
    END IF;
    
    UPDATE bookings SET status = 'telegram_broadcast', updated_at = NOW() WHERE id = p_booking_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_brokerage_fee_paid(p_driver_id UUID, p_paid_by UUID)
RETURNS TABLE(total_fees DECIMAL, affected_bookings INTEGER) AS $$
DECLARE
    v_tenant_id UUID;
    v_total_fees DECIMAL(10,2);
    v_affected INTEGER;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM drivers WHERE id = p_driver_id;
    
    SELECT COALESCE(SUM(fee_amount), 0), COUNT(*) INTO v_total_fees, v_affected
    FROM brokerage_fees WHERE driver_id = p_driver_id AND NOT is_paid;
    
    IF v_total_fees = 0 THEN
        RETURN QUERY SELECT 0::DECIMAL, 0;
        RETURN;
    END IF;
    
    UPDATE brokerage_fees SET is_paid = TRUE, paid_at = NOW(), paid_by = p_paid_by
    WHERE driver_id = p_driver_id AND NOT is_paid;
    
    UPDATE drivers SET current_balance = current_balance + v_total_fees, updated_at = NOW()
    WHERE id = p_driver_id;
    
    RETURN QUERY SELECT v_total_fees, v_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_munich_price(
    p_distance_km DECIMAL,
    p_passenger_count INTEGER DEFAULT 1,
    p_has_bicycle BOOLEAN DEFAULT FALSE,
    p_pickup_lat DECIMAL DEFAULT NULL,
    p_pickup_lng DECIMAL DEFAULT NULL,
    p_dest_lat DECIMAL DEFAULT NULL,
    p_dest_lng DECIMAL DEFAULT NULL
)
RETURNS TABLE(base_fare DECIMAL, distance_fare DECIMAL, surcharges DECIMAL, fixed_price DECIMAL, total DECIMAL, is_fixed_price BOOLEAN) AS $$
DECLARE
    v_base_fare DECIMAL := 5.90;
    v_km_rate DECIMAL := 2.70;
    v_surcharge_5plus DECIMAL := 10.00;
    v_surcharge_bicycle DECIMAL := 7.50;
    v_fixed_airport_messe DECIMAL := 94.00;
    v_fixed_hbf_airport DECIMAL := 106.00;
    v_fixed_hbf_messe DECIMAL := 43.00;
    v_distance_fare DECIMAL;
    v_surcharges DECIMAL := 0;
    v_total DECIMAL;
    v_is_fixed BOOLEAN := FALSE;
    v_fixed_price DECIMAL := NULL;
BEGIN
    -- Pruefe auf Festpreis-Routen
    IF p_pickup_lat IS NOT NULL AND p_dest_lat IS NOT NULL THEN
        IF p_distance_km BETWEEN 35 AND 50 THEN
            v_fixed_price := v_fixed_airport_messe;
            v_is_fixed := TRUE;
        ELSIF p_distance_km BETWEEN 38 AND 48 THEN
            v_fixed_price := v_fixed_hbf_airport;
            v_is_fixed := TRUE;
        ELSIF p_distance_km BETWEEN 12 AND 20 THEN
            v_fixed_price := v_fixed_hbf_messe;
            v_is_fixed := TRUE;
        END IF;
    END IF;
    
    IF v_is_fixed THEN
        v_surcharges := 0;
        IF p_passenger_count >= 5 THEN v_surcharges := v_surcharges + v_surcharge_5plus; END IF;
        IF p_has_bicycle THEN v_surcharges := v_surcharges + v_surcharge_bicycle; END IF;
        RETURN QUERY SELECT 0::DECIMAL, 0::DECIMAL, v_surcharges, v_fixed_price, v_fixed_price + v_surcharges, TRUE;
        RETURN;
    END IF;
    
    v_distance_fare := ROUND(p_distance_km * v_km_rate, 2);
    IF p_passenger_count >= 5 THEN v_surcharges := v_surcharges + v_surcharge_5plus; END IF;
    IF p_has_bicycle THEN v_surcharges := v_surcharges + v_surcharge_bicycle; END IF;
    v_total := v_base_fare + v_distance_fare + v_surcharges;
    
    RETURN QUERY SELECT v_base_fare, v_distance_fare, v_surcharges, NULL::DECIMAL, v_total, FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- TEIL 3: INITIALE DATEN EINFÜGEN
-- =============================================================================

INSERT INTO tenants (
    slug, name, legal_name, phone, email, website,
    street, zip_code, city, vat_id, tax_number, config
) VALUES (
    'ostbahnhof',
    'Taxi Center Ostbahnhof',
    'Taxi Center Ostbahnhof GmbH',
    '+49 89 12345678',
    'info@taxi-ostbahnhof.de',
    'https://taxi-ostbahnhof.de',
    'Bahnhofplatz 1',
    '80335',
    'München',
    'DE123456789',
    '123/456/78901',
    '{"theme":{"primary_color":"#F4C430","secondary_color":"#1a1a1a"},"services":["airport","messe","courier","medical"]}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    legal_name = EXCLUDED.legal_name,
    updated_at = NOW();

-- Fahrer einfügen
DO $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'ostbahnhof';
    
    INSERT INTO drivers (tenant_id, first_name, last_name, phone, email, license_number, vehicle_plate, vehicle_type, is_active, is_available)
    VALUES (v_tenant_id, 'Klaus', 'Mueller', '+49 173 1234567', 'klaus.mueller@taxi-ostbahnhof.de', 'TF-M-12345', 'M-KM 1234', 'xl', true, true)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO drivers (tenant_id, first_name, last_name, phone, email, license_number, vehicle_plate, vehicle_type, is_active, is_available)
    VALUES (v_tenant_id, 'Maria', 'Schneider', '+49 174 9876543', 'maria.schneider@taxi-ostbahnhof.de', 'TF-M-67890', 'M-MS 5678', 'luxury', true, false)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO drivers (tenant_id, first_name, last_name, phone, email, license_number, vehicle_plate, vehicle_type, is_active, is_available)
    VALUES (v_tenant_id, 'Hans', 'Weber', '+49 175 4567890', 'hans.weber@taxi-ostbahnhof.de', 'TF-M-11111', 'M-HW 9012', 'standard', true, true)
    ON CONFLICT DO NOTHING;
END $$;

-- =============================================================================
-- ERLEDIGT! 🚕
-- =============================================================================
