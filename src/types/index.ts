/**
 * GLOBALE TYPEN FÜR DAS TAXI-MANAGEMENT-SYSTEM
 */

// =============================================================================
// ENUMS
// =============================================================================

export type BookingStatus =
  | 'pending'
  | 'telegram_broadcast'
  | 'claimed'
  | 'assigned_manual'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type VehicleType = 'standard' | 'xl' | 'luxury' | 'wheelchair';

export type PaymentMethod = 'cash' | 'card' | 'invoice';

export type AssignmentType = 'telegram' | 'manual';

export type ActorType = 'driver' | 'admin' | 'system' | 'telegram_bot';

export type AdminRole = 'super_admin' | 'admin' | 'operator' | 'accountant';

export type FixedRouteType = 'airport_messe' | 'hbf_airport' | 'hbf_messe' | null;

// =============================================================================
// ENTITIES
// =============================================================================

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  legal_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  street?: string;
  zip_code?: string;
  city?: string;
  vat_id?: string;
  tax_number?: string;
  bank_name?: string;
  iban?: string;
  bic?: string;
  logo_light_url?: string;
  logo_dark_url?: string;
  favicon_url?: string;
  config?: Record<string, unknown>;
  is_active: boolean;
  is_verified: boolean;
  pricing_config?: {
    base_fare: number;
    km_rate: number;
    waiting_rate_per_hour: number;
    surcharge_5plus_passengers: number;
    surcharge_bicycle: number;
    fixed_prices: {
      airport_messe: number;
      hbf_airport: number;
      hbf_messe: number;
    };
  };
  telegram_group_id?: number;
  brokerage_fee_percent: number;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  license_number?: string;
  vehicle_plate?: string;
  vehicle_type: VehicleType;
  telegram_user_id?: number;
  telegram_username?: string;
  telegram_chat_id?: number;
  telegram_verified_at?: string;
  is_active: boolean;
  is_available: boolean;
  last_location?: {
    lat: number;
    lng: number;
  };
  last_location_at?: string;
  current_balance: number;
  total_earnings: number;
  total_brokerage_fees: number;
  bank_account_holder?: string;
  bank_iban?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  tenant_id: string;
  booking_number: string;
  status: BookingStatus;
  pickup_datetime: string;
  requested_at?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  pickup_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  pickup_district?: string;
  destination_address?: string;
  destination_lat?: number;
  destination_lng?: number;
  vehicle_type: VehicleType;
  passenger_count: number;
  has_bicycle: boolean;
  has_luggage: boolean;
  distance_km?: number;
  estimated_duration_min?: number;
  price_base_fare: number;
  price_distance_fare: number;
  price_waiting_fare: number;
  price_surcharges: number;
  price_fixed_fare?: number;
  price_total: number;
  fixed_route_type?: FixedRouteType;
  payment_method: PaymentMethod;
  needs_invoice: boolean;
  invoice_company?: string;
  invoice_vat_id?: string;
  invoice_address?: string;
  assigned_driver_id?: string;
  assigned_at?: string;
  assigned_by?: string;
  assignment_type?: AssignmentType;
  telegram_message_id?: number;
  telegram_claimed_at?: string;
  telegram_claimed_by_driver_id?: string;
  customer_notes?: string;
  internal_notes?: string;
  brokerage_fee_amount: number;
  brokerage_fee_paid: boolean;
  brokerage_fee_paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingWithDriver extends Booking {
  driver?: Driver;
}

export interface AuditLog {
  id: string;
  tenant_id?: string;
  actor_type: ActorType;
  actor_id?: string;
  actor_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface BrokerageFee {
  id: string;
  tenant_id: string;
  booking_id: string;
  driver_id: string;
  fee_amount: number;
  fee_percent: number;
  booking_total: number;
  is_paid: boolean;
  paid_at?: string;
  paid_by?: string;
  billing_period?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  tenant_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: AdminRole;
  permissions?: Record<string, boolean>;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// PRICING
// =============================================================================

export interface PricingBreakdown {
  baseFare: number;
  distanceFare: number;
  waitingFare: number;
  surcharges: {
    passengers5plus: number;
    bicycle: number;
    total: number;
  };
  fixedPrice: number | null;
  fixedRouteType: FixedRouteType;
  subtotal: number;
  total: number;
}

export interface PricingResult {
  breakdown: PricingBreakdown;
  isFixedPrice: boolean;
  distanceKm: number;
  estimatedDurationMin: number;
}

// =============================================================================
// TELEGRAM
// =============================================================================

export interface TelegramUpdate {
  update_id: number;
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
        type: string;
      };
    };
    data: string;
  };
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
}

// =============================================================================
// API RESPONSES
// =============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// =============================================================================
// DASHBOARD
// =============================================================================

export interface DashboardStats {
  totalBookingsToday: number;
  pendingBookings: number;
  activeBookings: number;
  completedBookingsToday: number;
  totalRevenueToday: number;
  outstandingBrokerageFees: number;
  availableDrivers: number;
}

export interface BookingFilter {
  status?: BookingStatus[];
  dateFrom?: string;
  dateTo?: string;
  driverId?: string;
  needsInvoice?: boolean;
  searchQuery?: string;
}

export interface DriverDebt {
  driver_id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  total_fees: number;
  paid_fees: number;
  outstanding_fees: number;
  unpaid_bookings: number;
}
