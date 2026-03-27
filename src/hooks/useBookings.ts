/**
 * HOOK: useBookings
 * React Hook für Buchungsmanagement mit Supabase Realtime
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Booking, BookingFilter, BookingStatus } from '@/types';

interface UseBookingsOptions {
  tenantId: string;
  filter?: BookingFilter;
  page?: number;
  perPage?: number;
}

interface UseBookingsReturn {
  bookings: Booking[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  broadcastToTelegram: (bookingId: string) => Promise<void>;
  assignDriver: (bookingId: string, driverId: string) => Promise<void>;
}

export function useBookings(options: UseBookingsOptions): UseBookingsReturn {
  const { tenantId, filter, page = 1, perPage = 25 } = options;
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Setze Mandanten-Kontext
      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

      let query = supabase
        .from('bookings')
        .select('*', { count: 'exact' });

      // Filter anwenden
      if (filter?.status && filter.status.length > 0) {
        query = query.in('status', filter.status);
      }

      if (filter?.dateFrom) {
        query = query.gte('pickup_datetime', filter.dateFrom);
      }

      if (filter?.dateTo) {
        query = query.lte('pickup_datetime', filter.dateTo);
      }

      if (filter?.driverId) {
        query = query.eq('assigned_driver_id', filter.driverId);
      }

      if (filter?.needsInvoice) {
        query = query.eq('needs_invoice', true);
      }

      if (filter?.searchQuery) {
        query = query.or(`
          booking_number.ilike.%${filter.searchQuery}%,
          customer_name.ilike.%${filter.searchQuery}%,
          pickup_address.ilike.%${filter.searchQuery}%
        `);
      }

      // Pagination
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const { data, error: supabaseError, count } = await query
        .order('pickup_datetime', { ascending: true })
        .range(from, to);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setBookings(data || []);
      setTotal(count || 0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unbekannter Fehler'));
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, filter, page, perPage]);

  // Initial fetch
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Realtime-Subscription
  useEffect(() => {
    const subscription = supabase
      .channel('bookings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          // Refetch bei Änderungen
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [tenantId, fetchBookings]);

  const updateStatus = async (bookingId: string, status: BookingStatus) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) {
      throw new Error(error.message);
    }

    await fetchBookings();
  };

  const broadcastToTelegram = async (bookingId: string) => {
    const { error } = await supabase.rpc('broadcast_to_telegram', {
      p_booking_id: bookingId,
    });

    if (error) {
      throw new Error(error.message);
    }

    await fetchBookings();
  };

  const assignDriver = async (bookingId: string, driverId: string) => {
    // Hole aktuellen Benutzer (Admin)
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.rpc('assign_booking_manual', {
      p_booking_id: bookingId,
      p_driver_id: driverId,
      p_assigned_by: user?.id,
    });

    if (error) {
      throw new Error(error.message);
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
  };
}
