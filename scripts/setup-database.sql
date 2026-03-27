-- =============================================================================
-- TAXI CENTER OSTBAHNHOF - INITIAL DATABASE SETUP
-- Führt alle notwendigen Konfigurationen durch
-- =============================================================================

-- =============================================================================
-- 1. MANDANT ANLEGEN
-- =============================================================================

INSERT INTO tenants (
    slug,
    name,
    legal_name,
    phone,
    email,
    website,
    street,
    zip_code,
    city,
    vat_id,
    tax_number,
    config,
    pricing_config,
    brokerage_fee_percent
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
        ],
        "contact": {
            "emergency_phone": "+49 89 12345679"
        }
    }'::jsonb,
    '{
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
    5.00
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    legal_name = EXCLUDED.legal_name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    updated_at = NOW();

-- Mandanten-ID speichern für weitere Verwendung
DO $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'ostbahnhof';
    
    -- =============================================================================
    -- 2. BEISPIEL-FAHRER ANLEGEN
    -- =============================================================================
    
    -- Fahrer 1: Klaus Müller
    INSERT INTO drivers (
        tenant_id,
        first_name,
        last_name,
        phone,
        email,
        license_number,
        vehicle_plate,
        vehicle_type,
        is_active,
        is_available
    ) VALUES (
        v_tenant_id,
        'Klaus',
        'Müller',
        '+49 173 1234567',
        'klaus.mueller@taxi-ostbahnhof.de',
        'TF-M-12345',
        'M-KM 1234',
        'xl',
        true,
        true
    )
    ON CONFLICT DO NOTHING;
    
    -- Fahrer 2: Maria Schneider
    INSERT INTO drivers (
        tenant_id,
        first_name,
        last_name,
        phone,
        email,
        license_number,
        vehicle_plate,
        vehicle_type,
        is_active,
        is_available
    ) VALUES (
        v_tenant_id,
        'Maria',
        'Schneider',
        '+49 174 9876543',
        'maria.schneider@taxi-ostbahnhof.de',
        'TF-M-67890',
        'M-MS 5678',
        'luxury',
        true,
        false
    )
    ON CONFLICT DO NOTHING;
    
    -- Fahrer 3: Hans Weber
    INSERT INTO drivers (
        tenant_id,
        first_name,
        last_name,
        phone,
        email,
        license_number,
        vehicle_plate,
        vehicle_type,
        is_active,
        is_available
    ) VALUES (
        v_tenant_id,
        'Hans',
        'Weber',
        '+49 175 4567890',
        'hans.weber@taxi-ostbahnhof.de',
        'TF-M-11111',
        'M-HW 9012',
        'standard',
        true,
        true
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Setup abgeschlossen für Mandant: %', v_tenant_id;
END $$;

-- =============================================================================
-- 3. KONFIGURATIONSHINWEISE
-- =============================================================================

-- Nach dem Setup müssen folgende Schritte durchgeführt werden:
--
-- 1. Telegram Gruppen-ID ermitteln und eintragen:
--    UPDATE tenants SET telegram_group_id = -123456789 WHERE slug = 'ostbahnhof';
--
-- 2. Fahrer Telegram-IDs zuordnen:
--    UPDATE drivers 
--    SET telegram_user_id = 12345678,
--        telegram_chat_id = 12345678,
--        telegram_verified_at = NOW()
--    WHERE id = 'driver-uuid';
--
-- 3. Edge Function deployen:
--    supabase functions deploy telegram-bot
--
-- 4. Webhook setzen (siehe scripts/setup-telegram.sh oder .ps1)

-- =============================================================================
-- 4. HILFREICHE ABFRAGEN
-- =============================================================================

-- Alle Fahrer anzeigen
-- SELECT * FROM drivers WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'ostbahnhof');

-- Offene Vermittlungsgebühren anzeigen
-- SELECT * FROM driver_brokerage_debts;

-- Tagesstatistik
-- SELECT * FROM get_daily_stats((SELECT id FROM tenants WHERE slug = 'ostbahnhof'), CURRENT_DATE);
