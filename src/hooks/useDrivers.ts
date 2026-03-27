/**
 * HOOK: useDrivers
 * React Hook für Fahrermanagement
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Driver, DriverDebt } from '@/types';

interface UseDriversOptions {
  tenantId: string;
  onlyActive?: boolean;
  onlyAvailable?: boolean;
}

interface UseDriversReturn {
  drivers: Driver[];
  debts: DriverDebt[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateDriver: (driverId: string, updates: Partial<Driver>) => Promise<void>;
  markFeesAsPaid: (driverId: string) => Promise<{ total: number; bookings: number }>;
}

export function useDrivers(options: UseDriversOptions): UseDriversReturn {
  const { tenantId, onlyActive = true, onlyAvailable = false } = options;
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [debts, setDebts] = useState<DriverDebt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Setze Mandanten-Kontext
      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

      // Fahrer laden
      let query = supabase.from('drivers').select('*');

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      if (onlyAvailable) {
        query = query.eq('is_available', true);
      }

      const { data: driversData, error: driversError } = await query.order('last_name');

      if (driversError) {
        throw new Error(driversError.message);
      }

      setDrivers(driversData || []);

      // Schulden laden
      const { data: debtsData, error: debtsError } = await supabase
        .from('driver_brokerage_debts')
        .select('*');

      if (debtsError) {
        throw new Error(debtsError.message);
      }

      setDebts(debtsData || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unbekannter Fehler'));
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, onlyActive, onlyAvailable]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateDriver = async (driverId: string, updates: Partial<Driver>) => {
    const { error } = await supabase
      .from('drivers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', driverId);

    if (error) {
      throw new Error(error.message);
    }

    await fetchData();
  };

  const markFeesAsPaid = async (driverId: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc('mark_brokerage_fee_paid', {
      p_driver_id: driverId,
      p_paid_by: user?.id,
    });

    if (error) {
      throw new Error(error.message);
    }

    await fetchData();

    return {
      total: data?.[0]?.total_fees || 0,
      bookings: data?.[0]?.affected_bookings || 0,
    };
  };

  return {
    drivers,
    debts,
    isLoading,
    error,
    refetch: fetchData,
    updateDriver,
    markFeesAsPaid,
  };
}
