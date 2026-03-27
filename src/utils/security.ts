/**
 * SECURITY UTILS
 * Input-Sanitization und Security-Helper
 */

/**
 * Sanitizes user input to prevent XSS
 * @param input - Raw user input
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns boolean
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates phone number (German format)
 * @param phone - Phone number to validate
 * @returns boolean
 */
export function isValidPhone(phone: string): boolean {
  // Allows: +49 123 456789, 0171 12345678, etc.
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validates UUID format
 * @param uuid - String to validate
 * @returns boolean
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates that value is within allowed enum values
 * @param value - Value to check
 * @param allowedValues - Array of allowed values
 * @returns boolean
 */
export function isValidEnum<T extends string>(
  value: string,
  allowedValues: readonly T[]
): value is T {
  return allowedValues.includes(value as T);
}

/**
 * Rate limiting helper - simple in-memory implementation
 * For production, use Redis or similar
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   * @param key - Identifier (e.g., IP address)
   * @returns boolean
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for key
    const requests = this.requests.get(key) || [];

    // Filter to only include requests within window
    const validRequests = requests.filter((timestamp) => timestamp > windowStart);

    // Check if under limit
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return true;
  }

  /**
   * Get remaining requests for key
   * @param key - Identifier
   * @returns number of remaining requests
   */
  getRemainingRequests(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter((timestamp) => timestamp > windowStart);
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter((timestamp) => timestamp > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter(100, 60000);

/**
 * Validates booking input data
 * @param data - Booking data to validate
 * @returns Validation result
 */
export function validateBookingInput(data: {
  pickup_address?: string;
  customer_phone?: string;
  customer_email?: string;
  price_total?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.pickup_address || data.pickup_address.trim().length < 5) {
    errors.push('Abholadresse muss mindestens 5 Zeichen haben');
  }

  if (data.customer_phone && !isValidPhone(data.customer_phone)) {
    errors.push('Ungültige Telefonnummer');
  }

  if (data.customer_email && !isValidEmail(data.customer_email)) {
    errors.push('Ungültige E-Mail-Adresse');
  }

  if (data.price_total === undefined || data.price_total < 0) {
    errors.push('Preis muss positiv sein');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
