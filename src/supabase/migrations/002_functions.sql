-- ========================================================================
-- DATENBANK-FUNKTIONEN
-- RPC-Funktionen für atomare Operationen und Business-Logik
-- ========================================================================

-- ========================================================================
-- 1. MANDANTEN-KONTEXT
-- ========================================================================

-- Funktion zum Setzen des Mandanten-Kontexts für RLS
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion zum Setzen des Actor-Kontexts für Audit-Logs
CREATE OR REPLACE FUNCTION set_actor_context(
    p_actor_type VARCHAR(20),
    p_actor_id UUID
)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_actor_type', p_actor_type, FALSE);
    PERFORM set_config('app.current_actor_id', COALESCE(p_actor_id::TEXT, ''), FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- 2. BUCHUNG CLAIMEN (ATOMAR)
-- ========================================================================

-- Funktion zum Claimen einer Buchung durch Telegram-Button
-- Verhindert Race Conditions durch SELECT FOR UPDATE
CREATE OR REPLACE FUNCTION claim_booking(
    p_booking_id UUID,
    p_driver_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_tenant_id UUID;
    v_current_status booking_status;
    v_booking_total DECIMAL(8,2);
    v_brokerage_fee DECIMAL(8,2);
    v_tenant_config JSONB;
BEGIN
    -- Buchung mit Lock holen
    SELECT 
        tenant_id, 
        status, 
        price_total,
        tenant_id
    INTO 
        v_tenant_id, 
        v_current_status, 
        v_booking_total,
        v_tenant_id
    FROM bookings
    WHERE id = p_booking_id
    FOR UPDATE NOWAIT;
    
    -- Prüfe ob Buchung verfügbar
    IF v_current_status != 'telegram_broadcast' THEN
        RAISE EXCEPTION 'Buchung ist nicht mehr verfügbar. Status: %', v_current_status;
    END IF;
    
    -- Hole Vermittlungsgebühr-Prozentsatz
    SELECT pricing_config->'brokerage_fee_percent' INTO v_tenant_config
    FROM tenants WHERE id = v_tenant_id;
    
    v_brokerage_fee := ROUND(v_booking_total * 0.05, 2); -- 5% Vermittlungsgebühr
    
    -- Aktualisiere Buchung
    UPDATE bookings
    SET 
        status = 'claimed',
        assigned_driver_id = p_driver_id,
        assignment_type = 'telegram',
        telegram_claimed_at = NOW(),
        telegram_claimed_by_driver_id = p_driver_id,
        brokerage_fee_amount = v_brokerage_fee,
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    -- Erstelle Vermittlungsgebühren-Eintrag
    INSERT INTO brokerage_fees (
        tenant_id,
        booking_id,
        driver_id,
        fee_amount,
        fee_percent,
        booking_total,
        billing_period
    ) VALUES (
        v_tenant_id,
        p_booking_id,
        p_driver_id,
        v_brokerage_fee,
        5.00,
        v_booking_total,
        TO_CHAR(NOW(), 'YYYY-MM')
    );
    
    -- Aktualisiere Fahrer-Bilanz
    UPDATE drivers
    SET 
        total_brokerage_fees = total_brokerage_fees + v_brokerage_fee,
        current_balance = current_balance - v_brokerage_fee,
        updated_at = NOW()
    WHERE id = p_driver_id;
    
    -- Audit-Log
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
        v_tenant_id,
        'driver',
        p_driver_id,
        'booking_claimed_telegram',
        'booking',
        p_booking_id,
        jsonb_build_object('status', 'telegram_broadcast'),
        jsonb_build_object(
            'status', 'claimed',
            'assigned_driver_id', p_driver_id,
            'brokerage_fee', v_brokerage_fee
        )
    );
    
    RETURN TRUE;
    
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION 'Buchung nicht gefunden';
    WHEN lock_not_available THEN
        RAISE EXCEPTION 'Buchung wird gerade bearbeitet';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- 3. MANUELLE ZUWEISUNG
-- ========================================================================

-- Funktion für manuelle Zuweisung durch Backoffice (0% Gebühr)
CREATE OR REPLACE FUNCTION assign_booking_manual(
    p_booking_id UUID,
    p_driver_id UUID,
    p_assigned_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_tenant_id UUID;
    v_current_status booking_status;
BEGIN
    SELECT tenant_id, status INTO v_tenant_id, v_current_status
    FROM bookings
    WHERE id = p_booking_id
    FOR UPDATE;
    
    IF v_current_status IN ('completed', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Buchung kann nicht zugewiesen werden. Status: %', v_current_status;
    END IF;
    
    UPDATE bookings
    SET 
        status = 'assigned_manual',
        assigned_driver_id = p_driver_id,
        assigned_by = p_assigned_by,
        assigned_at = NOW(),
        assignment_type = 'manual',
        brokerage_fee_amount = 0, -- Keine Gebühr bei manueller Zuweisung
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    INSERT INTO audit_logs (
        tenant_id,
        actor_type,
        actor_id,
        action,
        entity_type,
        entity_id,
        new_values
    ) VALUES (
        v_tenant_id,
        'admin',
        p_assigned_by,
        'booking_assigned_manual',
        'booking',
        p_booking_id,
        jsonb_build_object(
            'assigned_driver_id', p_driver_id,
            'brokerage_fee', 0
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- 4. BUCHUNG AN TELEGRAM SENDEN
-- ========================================================================

CREATE OR REPLACE FUNCTION broadcast_to_telegram(
    p_booking_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_tenant_id UUID;
    v_current_status booking_status;
    v_telegram_group_id BIGINT;
BEGIN
    SELECT 
        b.tenant_id, 
        b.status,
        t.telegram_group_id
    INTO 
        v_tenant_id, 
        v_current_status,
        v_telegram_group_id
    FROM bookings b
    JOIN tenants t ON b.tenant_id = t.id
    WHERE b.id = p_booking_id;
    
    IF v_current_status != 'pending' THEN
        RAISE EXCEPTION 'Buchung muss im Status pending sein. Aktuell: %', v_current_status;
    END IF;
    
    IF v_telegram_group_id IS NULL THEN
        RAISE EXCEPTION 'Keine Telegram-Gruppe für diesen Mandanten konfiguriert';
    END IF;
    
    UPDATE bookings
    SET 
        status = 'telegram_broadcast',
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    INSERT INTO audit_logs (
        tenant_id,
        actor_type,
        action,
        entity_type,
        entity_id,
        new_values
    ) VALUES (
        v_tenant_id,
        'system',
        'booking_broadcast_telegram',
        'booking',
        p_booking_id,
        jsonb_build_object('status', 'telegram_broadcast')
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- 5. GEBÜHREN ALS BEZAHLT MARKIEREN
-- ========================================================================

CREATE OR REPLACE FUNCTION mark_brokerage_fee_paid(
    p_driver_id UUID,
    p_paid_by UUID
)
RETURNS TABLE(
    total_fees DECIMAL,
    affected_bookings INTEGER
) AS $$
DECLARE
    v_tenant_id UUID;
    v_total_fees DECIMAL(10,2);
    v_affected INTEGER;
BEGIN
    SELECT tenant_id INTO v_tenant_id
    FROM drivers WHERE id = p_driver_id;
    
    -- Summe der offenen Gebühren
    SELECT COALESCE(SUM(fee_amount), 0), COUNT(*)
    INTO v_total_fees, v_affected
    FROM brokerage_fees
    WHERE driver_id = p_driver_id AND NOT is_paid;
    
    IF v_total_fees = 0 THEN
        RETURN QUERY SELECT 0::DECIMAL, 0;
        RETURN;
    END IF;
    
    -- Markiere als bezahlt
    UPDATE brokerage_fees
    SET 
        is_paid = TRUE,
        paid_at = NOW(),
        paid_by = p_paid_by
    WHERE driver_id = p_driver_id AND NOT is_paid;
    
    -- Aktualisiere Fahrer-Bilanz
    UPDATE drivers
    SET 
        current_balance = current_balance + v_total_fees,
        updated_at = NOW()
    WHERE id = p_driver_id;
    
    -- Audit-Log
    INSERT INTO audit_logs (
        tenant_id,
        actor_type,
        actor_id,
        action,
        entity_type,
        entity_id,
        new_values
    ) VALUES (
        v_tenant_id,
        'admin',
        p_paid_by,
        'brokerage_fees_paid',
        'driver',
        p_driver_id,
        jsonb_build_object(
            'amount', v_total_fees,
            'bookings_count', v_affected
        )
    );
    
    RETURN QUERY SELECT v_total_fees, v_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- 6. STATISTIK-FUNKTIONEN
-- ========================================================================

-- Tagesstatistik für Dashboard
CREATE OR REPLACE FUNCTION get_daily_stats(
    p_tenant_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_bookings BIGINT,
    completed_bookings BIGINT,
    total_revenue DECIMAL,
    telegram_claimed_bookings BIGINT,
    manual_assigned_bookings BIGINT,
    total_brokerage_fees DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT,
        COALESCE(SUM(price_total) FILTER (WHERE status = 'completed'), 0),
        COUNT(*) FILTER (WHERE assignment_type = 'telegram')::BIGINT,
        COUNT(*) FILTER (WHERE assignment_type = 'manual')::BIGINT,
        COALESCE(SUM(brokerage_fee_amount), 0)
    FROM bookings
    WHERE tenant_id = p_tenant_id
    AND DATE(created_at) = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fahrer-Statistiken
CREATE OR REPLACE FUNCTION get_driver_stats(
    p_driver_id UUID,
    p_from_date DATE,
    p_to_date DATE
)
RETURNS TABLE(
    total_bookings BIGINT,
    completed_bookings BIGINT,
    total_earnings DECIMAL,
    total_brokerage_fees DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT,
        COALESCE(SUM(price_total) FILTER (WHERE status = 'completed'), 0),
        COALESCE(SUM(brokerage_fee_amount), 0)
    FROM bookings
    WHERE assigned_driver_id = p_driver_id
    AND DATE(created_at) BETWEEN p_from_date AND p_to_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- 7. BERECHNUNGSFUNKTIONEN
-- ========================================================================

-- Preisberechnung basierend auf Münchner Tarif
CREATE OR REPLACE FUNCTION calculate_munich_price(
    p_distance_km DECIMAL,
    p_passenger_count INTEGER DEFAULT 1,
    p_has_bicycle BOOLEAN DEFAULT FALSE,
    p_pickup_lat DECIMAL DEFAULT NULL,
    p_pickup_lng DECIMAL DEFAULT NULL,
    p_dest_lat DECIMAL DEFAULT NULL,
    p_dest_lng DECIMAL DEFAULT NULL
)
RETURNS TABLE(
    base_fare DECIMAL,
    distance_fare DECIMAL,
    surcharges DECIMAL,
    fixed_price DECIMAL,
    total DECIMAL,
    is_fixed_price BOOLEAN
) AS $$
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
    -- Prüfe auf Festpreis-Routen (vereinfachte Distanzprüfung)
    IF p_pickup_lat IS NOT NULL AND p_dest_lat IS NOT NULL THEN
        -- Flughafen-Messe: ~40km
        IF p_distance_km BETWEEN 35 AND 50 THEN
            v_fixed_price := v_fixed_airport_messe;
            v_is_fixed := TRUE;
        -- HBF-Flughafen: ~40km
        ELSIF p_distance_km BETWEEN 38 AND 48 THEN
            v_fixed_price := v_fixed_hbf_airport;
            v_is_fixed := TRUE;
        -- HBF-Messe: ~15km
        ELSIF p_distance_km BETWEEN 12 AND 20 THEN
            v_fixed_price := v_fixed_hbf_messe;
            v_is_fixed := TRUE;
        END IF;
    END IF;
    
    IF v_is_fixed THEN
        v_surcharges := 0;
        IF p_passenger_count >= 5 THEN
            v_surcharges := v_surcharges + v_surcharge_5plus;
        END IF;
        IF p_has_bicycle THEN
            v_surcharges := v_surcharges + v_surcharge_bicycle;
        END IF;
        
        RETURN QUERY SELECT 
            0::DECIMAL, 
            0::DECIMAL, 
            v_surcharges, 
            v_fixed_price, 
            v_fixed_price + v_surcharges,
            TRUE;
        RETURN;
    END IF;
    
    -- Standard-Tarif
    v_distance_fare := ROUND(p_distance_km * v_km_rate, 2);
    
    IF p_passenger_count >= 5 THEN
        v_surcharges := v_surcharges + v_surcharge_5plus;
    END IF;
    
    IF p_has_bicycle THEN
        v_surcharges := v_surcharges + v_surcharge_bicycle;
    END IF;
    
    v_total := v_base_fare + v_distance_fare + v_surcharges;
    
    RETURN QUERY SELECT 
        v_base_fare, 
        v_distance_fare, 
        v_surcharges, 
        NULL::DECIMAL, 
        v_total,
        FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
