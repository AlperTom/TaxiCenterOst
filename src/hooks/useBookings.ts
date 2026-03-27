/**
 * HOOK: useBookings
 * React Hook für Buchungsmanagement mit verbessertem Error-Handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api/client';
import type { Booking, BookingFilter, BookingStatus } from '@/types';
import type { ApiError } from '@/types/api';

interface UseBookingsOptions {
  tenantId: string;
  filter?: BookingFilter;
  page?: number;
  perPage?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseBookingsReturn {
  bookings: Booking[];
  total: number;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  updateStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  broadcastToTelegram: (bookingId: string) => Promise<void>;
  assignDriver: (bookingId: string, driverId: string) => Promise<void>;
  claimBooking: (bookingId: string) => Promise<void>;
  retryCount: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

/**
 * React Hook für Buchungsmanagement
 * @param options - Konfigurationsoptionen
 * @returns Buchungsdaten und Operationen
 */
export function useBookings(options: UseBookingsOptions): UseBookingsReturn {
  const { 
    tenantId, 
    filter, 
    page = 1, 
    perPage = 25,
    autoRefresh = true,
    refreshInterval = 30000
  } = options;
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch Bookings mit Retry-Logik
   */
  const fetchBookings = useCallback(async (isRetry = false): Promise<void> => {
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
      const response = await api.bookings.getBookings(filter);

      if (response.error) {
        throw new Error(response.error.message);
      }

      setBookings(response.data || []);
      setTotal(response.data?.length || 0);
      setError(null);
      setRetryCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      
      // Retry-Logik
      if (retryCount < MAX_RETRIES && !abortControllerRef.current.signal.aborted) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount);
        setRetryCount((prev) => prev + 1);
        
        retryTimeoutRef.current = setTimeout(() => {
          void fetchBookings(true);
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
  }, [filter, retryCount]);

  // Initial fetch und Polling
  useEffect(() => {
    void fetchBookings();

    if (autoRefresh) {
      const interval = setInterval(() => {
        void fetchBookings();
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
  }, [fetchBookings, autoRefresh, refreshInterval]);

  /**
   * Buchungsstatus aktualisieren
   */
  const updateStatus = async (bookingId: string, status: BookingStatus): Promise<void> => {
    const response = await api.bookings.updateBookingStatus(bookingId, status);
    
    if (response.error) {
      throw new Error(response.error.message);
    }

    // Optimistic Update
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
    );

    await fetchBookings();
  };

  /**
   * An Telegram broadcasten
   */
  const broadcastToTelegram = async (bookingId: string): Promise<void> => {
    const response = await api.bookings.broadcastToTelegram(bookingId);
    
    if (response.error) {
      throw new Error(response.error.message);
    }

    await fetchBookings();
  };

  /**
   * Fahrer manuell zuweisen
   */
  const assignDriver = async (bookingId: string, driverId: string): Promise<void> => {
    const response = await api.bookings.assignDriver(bookingId, driverId);
    
    if (response.error) {
      throw new Error(response.error.message);
    }

    await fetchBookings();
  };

  /**
   * Buchung claimen (für Fahrer)
   */
  const claimBooking = async (bookingId: string): Promise<void> => {
    const response = await api.bookings.claimBooking(bookingId);
    
    if (response.error) {
      throw new Error(response.error.message);
    }

    await fetchBookings();
  };

  return {
    bookings,
    total,
    isLoading,
    error,
    refetch: fetchBookings,
    updateStatus,
    broadcastToTelegram,
    assignDriver,
    claimBooking,
    retryCount,
  };
}

export default useBookings;
