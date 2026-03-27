/**
 * API TYPEN
 * Typdefinitionen für API-Responses und Errors
 */

import type { Booking, Driver, BookingFilter } from '@/types';

/**
 * Standard API Response
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

/**
 * API Error Typ
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Paginierte API Response
 */
export interface PaginatedApiResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Buchungs-API Typen
 */
export interface BookingsApi {
  getBookings(filter?: BookingFilter): Promise<ApiResponse<Booking[]>>;
  getBookingById(id: string): Promise<ApiResponse<Booking>>;
  createBooking(booking: CreateBookingInput): Promise<ApiResponse<Booking>>;
  updateBookingStatus(id: string, status: string): Promise<ApiResponse<void>>;
  claimBooking(id: string): Promise<ApiResponse<void>>;
  assignDriver(bookingId: string, driverId: string): Promise<ApiResponse<void>>;
  broadcastToTelegram(id: string): Promise<ApiResponse<void>>;
}

/**
 * Input für neue Buchung
 */
export interface CreateBookingInput {
  pickup_datetime: string;
  pickup_address: string;
  pickup_district?: string;
  destination_address?: string;
  customer_name?: string;
  customer_phone?: string;
  vehicle_type?: string;
  passenger_count?: number;
  has_bicycle?: boolean;
  price_total: number;
}

/**
 * Fahrer-API Typen
 */
export interface DriversApi {
  getDrivers(): Promise<ApiResponse<Driver[]>>;
  getDriverById(id: string): Promise<ApiResponse<Driver>>;
  updateDriver(id: string, updates: Partial<Driver>): Promise<ApiResponse<Driver>>;
  markFeesAsPaid(driverId: string): Promise<ApiResponse<{ total: number; bookings: number }>>;
}

/**
 * Telegram-API Typen
 */
export interface TelegramApi {
  validateBotToken(): Promise<ApiResponse<{ valid: boolean; botName?: string }>>;
  getWebhookInfo(): Promise<ApiResponse<unknown>>;
}

/**
 * API Client Interface
 */
export interface ApiClientInterface {
  bookings: BookingsApi;
  drivers: DriversApi;
  telegram: TelegramApi;
}
