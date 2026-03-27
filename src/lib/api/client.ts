/**
 * API CLIENT
 * Zentraler, typisierter API-Client für alle Backend-Operationen
 * Abstrahiert Supabase-Calls und bietet einheitliches Error-Handling
 */

import { supabase } from '@/lib/supabase/client';
import type { 
  ApiResponse, 
  ApiError, 
  BookingsApi, 
  DriversApi, 
  TelegramApi,
  CreateBookingInput 
} from '@/types/api';
import type { Booking, Driver, BookingFilter } from '@/types';

/**
 * Erstellt ein standardisiertes API Error Objekt
 */
function createApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
    };
  }
  
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    return {
      code: String(err.code || 'UNKNOWN_ERROR'),
      message: String(err.message || 'Ein unbekannter Fehler ist aufgetreten'),
      details: err.details as Record<string, unknown> | undefined,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Ein unbekannter Fehler ist aufgetreten',
  };
}

/**
 * Hilfsfunktion für typisierte API Responses
 */
function createApiResponse<T>(data: T | null, error: ApiError | null): ApiResponse<T> {
  return { data, error };
}

/**
 * Buchungs-API Implementierung
 */
const bookingsApi: BookingsApi = {
  /**
   * Holt alle Buchungen mit optionalem Filter
   */
  async getBookings(filter?: BookingFilter): Promise<ApiResponse<Booking[]>> {
    try {
      let query = supabase.from('bookings').select('*');

      if (filter?.status?.length) {
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

      const { data, error } = await query.order('pickup_datetime', { ascending: true });

      if (error) throw error;
      return createApiResponse(data as Booking[], null);
    } catch (err) {
      console.error('[API] getBookings error:', err);
      return createApiResponse(null, createApiError(err));
    }
  },

  /**
   * Holt eine einzelne Buchung nach ID
   */
  async getBookingById(id: string): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return createApiResponse(data as Booking, null);
    } catch (err) {
      console.error('[API] getBookingById error:', err);
      return createApiResponse(null, createApiError(err));
    }
  },

  /**
   * Erstellt eine neue Buchung
   */
  async createBooking(booking: CreateBookingInput): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([booking])
        .select()
        .single();

      if (error) throw error;
      return createApiResponse(data as Booking, null);
    } catch (err) {
      console.error('[API] createBooking error:', err);
      return createApiResponse(null, createApiError(err));
    }
  },

  /**
   * Aktualisiert den Status einer Buchung
   */
  async updateBookingStatus(id: string, status: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return createApiResponse(undefined, null);
    } catch (err) {
      console.error('[API] updateBookingStatus error:', err);
      return createApiResponse(null, createApiError(err));
    }
  },

  /**
   * Lässt einen Fahrer eine Buchung claimen (Telegram)
   */
  async claimBooking(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.rpc('claim_booking', {
        p_booking_id: id,
        p_driver_id: '00000000-0000-0000-0000-000000000000', // Wird von Edge Function überschrieben
      });

      if (error) throw error;
      return createApiResponse(undefined, null);
    } catch (err) {
      console.error('[API] claimBooking error:', err);
      return createApiResponse(null, createApiError(err));
    }
  },

  /**
   * Weist einen Fahrer manuell zu (Admin)
   */
  async assignDriver(bookingId: string, driverId: string): Promise<ApiResponse<void>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase.rpc('assign_booking_manual', {
        p_booking_id: bookingId,
        p_driver_id: driverId,
        p_assigned_by: userData.user?.id,
      });

      if (error) throw error;
      return createApiResponse(undefined, null);
    } catch (err) {
      console.error('[API] assignDriver error:', err);
      return createApiResponse(null, createApiError(err));
    }
  },

  /**
   * Sendet Buchung an Telegram-Gruppe
   */
  async broadcastToTelegram(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.rpc('broadcast_to_telegram', {
        p_booking_id: id,
      });

      if (error) throw error;
      return createApiResponse(undefined, null);
    } catch (err) {
      console.error('[API] broadcastToTelegram error:', err);
      return createApiResponse(null, createApiError(err));
    }
  },
};

/**
 * Fahrer-API Implementierung
 */
const driversApi: DriversApi = {
  /**
   * Holt alle aktiven Fahrer
   */
  async getDrivers(): Promise<ApiResponse<Driver[]>> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_active', true)
        .order('last_name');

      if (error) throw error;
      return createApiResponse(data as Driver[], null);
    } catch (err) {
      console.error('[API] getDrivers error:', err);
      return createApiResponse(null, createApiError(err));
    }
  },

  /**
   * Holt einen Fahrer nach ID
   */
  async getDriverById(id: string): Promise<ApiResponse<Driver>> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return createApiResponse(data as Driver, null);
    } catch (err) {
      console.error('[API] getDriverById error:', err);
      return createApiResponse(null, createApiError(err));
    }
  },

  /**
   * Aktualisiert einen Fahrer
   */
  async updateDriver(id: string, updates: Partial<Driver>): Promise<ApiResponse<Driver>> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return createApiResponse(data as Driver, null);
    } catch (err) {
      console.error('[API] updateDriver error:', err);
      return createApiResponse(null, createApiError(err));
    }
  },

  /**
   * Markiert Vermittlungsgebühren als bezahlt
   */
  async markFeesAsPaid(driverId: string): Promise<ApiResponse<{ total: number; bookings: number }>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc('mark_brokerage_fee_paid', {
        p_driver_id: driverId,
        p_paid_by: userData.user?.id,
      });

      if (error) throw error;
      return createApiResponse(data?.[0] || { total: 0, bookings: 0 }, null);
    } catch (err) {
      console.error('[API] markFeesAsPaid error:', err);
      return createApiResponse(null, createApiError(err));
    }
  },
};

/**
 * Telegram-API Implementierung
 */
const telegramApi: TelegramApi = {
  /**
   * Validiert den Bot-Token
   */
  async validateBotToken(): Promise<ApiResponse<{ valid: boolean; botName?: string }>> {
    try {
      const response = await fetch('/api/telegram/validate');
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.message || 'Validation failed');
      return createApiResponse(result, null);
    } catch (err) {
      console.error('[API] validateBotToken error:', err);
      return createApiResponse(null, createApiError(err));
    }
  },

  /**
   * Holt Webhook-Informationen
   */
  async getWebhookInfo(): Promise<ApiResponse<unknown>> {
    try {
      const response = await fetch('/api/telegram/webhook-info');
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.message || 'Failed to get webhook info');
      return createApiResponse(result, null);
    } catch (err) {
      console.error('[API] getWebhookInfo error:', err);
      return createApiResponse(null, createApiError(err));
    }
  },
};

/**
 * Zentraler API-Client
 * Verwendung: import { api } from '@/lib/api/client'
 */
export const api = {
  bookings: bookingsApi,
  drivers: driversApi,
  telegram: telegramApi,
};

export default api;
