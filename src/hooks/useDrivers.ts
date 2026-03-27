/**
 * HOOK: useDrivers
 * React Hook für Fahrermanagement mit verbessertem Error-Handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api/client';
import { supabase } from '@/lib/supabase/client';
import type { Driver, DriverDebt } from '@/types';
import type { ApiError } from '@/types/api';

interface UseDriversOptions {
  tenantId: string;
  onlyActive?: boolean;
  onlyAvailable?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseDriversReturn {
  drivers: Driver[];
  debts: DriverDebt[];
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  updateDriver: (driverId: string, updates: Partial<Driver>) => Promise<void>;
  markFeesAsPaid: (driverId: string) => Promise<{ total: number; bookings: number }>;
  retryCount: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

/**
 * React Hook für Fahrermanagement
 * @param options - Konfigurationsoptionen
 * @returns Fahrerdaten und Operationen
 */
export function useDrivers(options: UseDriversOptions): UseDriversReturn {
  const { 
    tenantId, 
    onlyActive = true, 
    onlyAvailable = false,
    autoRefresh = true,
    refreshInterval = 30000
  } = options;
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [debts, setDebts] = useState<DriverDebt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch Drivers mit Retry-Logik
   */
  const fetchData = useCallback(async (isRetry = false): Promise<void> => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!isRetry) {
      setIsLoading(true);
      setError(null);
      setRetryCount(0);
    }

    try {
      // Fahrer laden
      const driversResponse = await api.drivers.getDrivers();
      
      if (driversResponse.error) {
        throw new Error(driversResponse.error.message);
      }

      let filteredDrivers = driversResponse.data || [];
      
      if (onlyAvailable) {
        filteredDrivers = filteredDrivers.filter(d => d.is_available);
      }

      setDrivers(filteredDrivers);

      // Schulden laden (via Supabase View)
      const { data: debtsData, error: debtsError } = await supabase
        .from('driver_brokerage_debts')
        .select('*');

      if (debtsError) {
        console.warn('[useDrivers] Could not fetch debts:', debtsError);
      } else {
        setDebts(debtsData || []);
      }

      setError(null);
      setRetryCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      
      // Retry-Logik
      if (retryCount < MAX_RETRIES && !abortControllerRef.current.signal.aborted) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount);
        setRetryCount((prev) => prev + 1);
        
        retryTimeoutRef.current = setTimeout(() => {
          void fetchData(true);
        }, delay);
        
        return;
      }

      setError({
        code: 'FETCH_ERROR',
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [onlyActive, onlyAvailable, retryCount]);

  // Initial fetch und Polling
  useEffect(() => {
    void fetchData();

    if (autoRefresh) {
      const interval = setInterval(() => {
        void fetchData();
      }, refreshInterval);

      return () => {
        clearInterval(interval);
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        abortControllerRef.current?.abort();
      };
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, [fetchData, autoRefresh, refreshInterval]);

  /**
   * Fahrer aktualisieren
   */
  const updateDriver = async (driverId: string, updates: Partial<Driver>): Promise<void> => {
    const response = await api.drivers.updateDriver(driverId, updates);
    
    if (response.error) {
      throw new Error(response.error.message);
    }

    // Optimistic Update
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, ...updates } : d))
    );

    await fetchData();
  };

  /**
   * Gebühren als bezahlt markieren
   */
  const markFeesAsPaid = async (driverId: string): Promise<{ total: number; bookings: number }> => {
    const response = await api.drivers.markFeesAsPaid(driverId);
    
    if (response.error) {
      throw new Error(response.error.message);
    }

    await fetchData();
    return response.data || { total: 0, bookings: 0 };
  };

  return {
    drivers,
    debts,
    isLoading,
    error,
    refetch: fetchData,
    updateDriver,
    markFeesAsPaid,
    retryCount,
  };
}

export default useDrivers;
