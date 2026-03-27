/**
 * MÜNCHNER TAXITARIF-ENGINE
 * BOKraft-konforme Preisberechnung
 * 
 * Offizieller Tarif München (Stand 2024):
 * - Grundpreis: 5,90 €
 * - Kilometerpreis: 2,70 €
 * - Wartezeit: 39,00 €/Std.
 * 
 * Zuschläge:
 * - Ab 5. Fahrgast: 10,00 €
 * - Fahrradmitnahme: 7,50 €
 * 
 * Festpreise:
 * - Flughafen ↔ Messe: 94,00 €
 * - Hbf ↔ Flughafen: 106,00 €
 * - Hbf ↔ Messe: 43,00 €
 */

// =============================================================================
// TARIF-KONSTANTEN
// =============================================================================

export const MUNICH_TARIFF = {
  // Basispreise
  BASE_FARE: 5.90,
  KM_RATE: 2.70,
  WAITING_RATE_PER_HOUR: 39.00,
  WAITING_RATE_PER_MINUTE: 39.00 / 60,
  
  // Zuschläge
  SURCHARGE_5PLUS_PASSENGERS: 10.00,
  SURCHARGE_BICYCLE: 7.50,
  
  // Festpreis-Routen
  FIXED_PRICES: {
    AIRPORT_MESSE: 94.00,
    HBF_AIRPORT: 106.00,
    HBF_MESSE: 43.00,
  },
} as const;

// Geografische Koordinaten für Festpreis-Routen
export const FIXED_ROUTE_COORDINATES = {
  AIRPORT: {
    name: 'Flughafen München (MUC)',
    lat: 48.3539,
    lng: 11.7861,
    radius_km: 2.0, // Akzeptanzradius
  },
  MESSE: {
    name: 'Messe München',
    lat: 48.1351,
    lng: 11.6920,
    radius_km: 1.5,
  },
  HBF: {
    name: 'Hauptbahnhof München',
    lat: 48.1402,
    lng: 11.5610,
    radius_km: 1.0,
  },
} as const;

// =============================================================================
// TYPEN
// =============================================================================

export type VehicleType = 'standard' | 'xl' | 'luxury' | 'wheelchair';

export type FixedRouteType = 'airport_messe' | 'hbf_airport' | 'hbf_messe' | null;

export interface PricingInput {
  distanceKm: number;
  durationMin?: number;
  passengerCount?: number;
  hasBicycle?: boolean;
  vehicleType?: VehicleType;
  pickupLat?: number;
  pickupLng?: number;
  destinationLat?: number;
  destinationLng?: number;
}

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
// HILFSFUNKTIONEN
// =============================================================================

/**
 * Berechnet die Distanz zwischen zwei Koordinaten (Haversine-Formel)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Erdradius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Prüft, ob eine Koordinate innerhalb eines Radius liegt
 */
function isWithinRadius(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number
): boolean {
  const distance = calculateDistance(lat, lng, centerLat, centerLng);
  return distance <= radiusKm;
}

/**
 * Erkennt, ob eine Route einem Festpreis entspricht
 */
export function detectFixedRoute(
  pickupLat: number,
  pickupLng: number,
  destLat: number,
  destLng: number
): { type: FixedRouteType; price: number | null } {
  const { AIRPORT, MESSE, HBF } = FIXED_ROUTE_COORDINATES;
  
  // Prüfe Flughafen ↔ Messe
  const pickupNearAirport = isWithinRadius(
    pickupLat, pickupLng, AIRPORT.lat, AIRPORT.lng, AIRPORT.radius_km
  );
  const destNearAirport = isWithinRadius(
    destLat, destLng, AIRPORT.lat, AIRPORT.lng, AIRPORT.radius_km
  );
  const pickupNearMesse = isWithinRadius(
    pickupLat, pickupLng, MESSE.lat, MESSE.lng, MESSE.radius_km
  );
  const destNearMesse = isWithinRadius(
    destLat, destLng, MESSE.lat, MESSE.lng, MESSE.radius_km
  );
  
  if ((pickupNearAirport && destNearMesse) || (pickupNearMesse && destNearAirport)) {
    return { type: 'airport_messe', price: MUNICH_TARIFF.FIXED_PRICES.AIRPORT_MESSE };
  }
  
  // Prüfe Hbf ↔ Flughafen
  const pickupNearHbf = isWithinRadius(
    pickupLat, pickupLng, HBF.lat, HBF.lng, HBF.radius_km
  );
  const destNearHbf = isWithinRadius(
    destLat, destLng, HBF.lat, HBF.lng, HBF.radius_km
  );
  
  if ((pickupNearHbf && destNearAirport) || (pickupNearAirport && destNearHbf)) {
    return { type: 'hbf_airport', price: MUNICH_TARIFF.FIXED_PRICES.HBF_AIRPORT };
  }
  
  // Prüfe Hbf ↔ Messe
  if ((pickupNearHbf && destNearMesse) || (pickupNearMesse && destNearHbf)) {
    return { type: 'hbf_messe', price: MUNICH_TARIFF.FIXED_PRICES.HBF_MESSE };
  }
  
  return { type: null, price: null };
}

/**
 * Formatiert einen Preis als Euro-String
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Rundet auf 2 Dezimalstellen
 */
function roundPrice(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// =============================================================================
// HAUPT-FUNKTION: PREISBERECHNUNG
// =============================================================================

/**
 * Berechnet den Fahrpreis basierend auf dem Münchner Tarif
 * Berücksichtigt automatisch Festpreis-Routen
 */
export function calculatePrice(input: PricingInput): PricingResult {
  const {
    distanceKm,
    durationMin = 0,
    passengerCount = 1,
    hasBicycle = false,
    pickupLat,
    pickupLng,
    destinationLat,
    destinationLng,
  } = input;

  // Geschätzte Fahrtdauer (falls nicht angegeben: ~1 min pro km + 2 min Basis)
  const estimatedDurationMin = durationMin || Math.round(distanceKm + 2);

  // Prüfe auf Festpreis-Route (wenn Koordinaten vorhanden)
  let fixedRouteResult: { type: FixedRouteType; price: number | null } = {
    type: null,
    price: null,
  };

  if (
    pickupLat !== undefined &&
    pickupLng !== undefined &&
    destinationLat !== undefined &&
    destinationLng !== undefined
  ) {
    fixedRouteResult = detectFixedRoute(pickupLat, pickupLng, destinationLat, destinationLng);
  }

  // Berechne Zuschläge
  const passengerSurcharge =
    passengerCount >= 5 ? MUNICH_TARIFF.SURCHARGE_5PLUS_PASSENGERS : 0;
  const bicycleSurcharge = hasBicycle ? MUNICH_TARIFF.SURCHARGE_BICYCLE : 0;
  const totalSurcharges = passengerSurcharge + bicycleSurcharge;

  // Wenn Festpreis-Route erkannt
  if (fixedRouteResult.price !== null) {
    const total = roundPrice(fixedRouteResult.price + totalSurcharges);

    return {
      breakdown: {
        baseFare: 0,
        distanceFare: 0,
        waitingFare: 0,
        surcharges: {
          passengers5plus: passengerSurcharge,
          bicycle: bicycleSurcharge,
          total: totalSurcharges,
        },
        fixedPrice: fixedRouteResult.price,
        fixedRouteType: fixedRouteResult.type,
        subtotal: fixedRouteResult.price,
        total,
      },
      isFixedPrice: true,
      distanceKm,
      estimatedDurationMin,
    };
  }

  // Standard-Tarifberechnung
  const baseFare = MUNICH_TARIFF.BASE_FARE;
  const distanceFare = roundPrice(distanceKm * MUNICH_TARIFF.KM_RATE);
  const waitingFare = 0; // Wird erst bei Fahrtende berechnet
  const subtotal = baseFare + distanceFare;
  const total = roundPrice(subtotal + totalSurcharges);

  return {
    breakdown: {
      baseFare,
      distanceFare,
      waitingFare,
      surcharges: {
        passengers5plus: passengerSurcharge,
        bicycle: bicycleSurcharge,
        total: totalSurcharges,
      },
      fixedPrice: null,
      fixedRouteType: null,
      subtotal,
      total,
    },
    isFixedPrice: false,
    distanceKm,
    estimatedDurationMin,
  };
}

/**
 * Berechnet die Wartezeitgebühr
 */
export function calculateWaitingFare(waitingMinutes: number): number {
  return roundPrice(waitingMinutes * MUNICH_TARIFF.WAITING_RATE_PER_MINUTE);
}

/**
 * Berechnet den Endpreis inklusive Wartezeit
 */
export function calculateFinalPrice(
  basePrice: PricingResult,
  actualWaitingMinutes: number
): PricingBreakdown {
  const waitingFare = calculateWaitingFare(actualWaitingMinutes);
  const total = roundPrice(basePrice.breakdown.subtotal + waitingFare + basePrice.breakdown.surcharges.total);

  return {
    ...basePrice.breakdown,
    waitingFare,
    total,
  };
}

// =============================================================================
// VALIDIERUNGSFUNKTIONEN
// =============================================================================

/**
 * Validiert eine Preisberechnung gegen den offiziellen Tarif
 */
export function validatePriceCalculation(
  calculatedTotal: number,
  distanceKm: number,
  passengerCount: number,
  hasBicycle: boolean
): { isValid: boolean; expectedMin: number; expectedMax: number; issues: string[] } {
  const issues: string[] = [];
  
  // Mindestpreis berechnen
  let expectedMin = MUNICH_TARIFF.BASE_FARE + (distanceKm * MUNICH_TARIFF.KM_RATE);
  if (passengerCount >= 5) expectedMin += MUNICH_TARIFF.SURCHARGE_5PLUS_PASSENGERS;
  if (hasBicycle) expectedMin += MUNICH_TARIFF.SURCHARGE_BICYCLE;
  
  // Toleranz: ±0,50 € (Rundungsdifferenzen)
  const expectedMax = expectedMin + 0.50;
  expectedMin = Math.max(0, expectedMin - 0.50);
  
  const isValid = calculatedTotal >= expectedMin && calculatedTotal <= expectedMax;
  
  if (!isValid) {
    issues.push(
      `Berechneter Preis (${formatPrice(calculatedTotal)}) außerhalb der Toleranz ` +
      `(${formatPrice(expectedMin)} - ${formatPrice(expectedMax)})`
    );
  }
  
  return { isValid, expectedMin, expectedMax, issues };
}

// =============================================================================
// EXPORT: Alle Funktionen
// =============================================================================

export const MunichTariffEngine = {
  calculatePrice,
  calculateWaitingFare,
  calculateFinalPrice,
  detectFixedRoute,
  calculateDistance,
  formatPrice,
  validatePriceCalculation,
  CONSTANTS: MUNICH_TARIFF,
  LOCATIONS: FIXED_ROUTE_COORDINATES,
};

export default MunichTariffEngine;
