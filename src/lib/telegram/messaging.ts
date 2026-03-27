/**
 * TELEGRAM MESSAGING UTILITIES
 * Hilfsfunktionen für den zweistufigen Telegram-Workflow
 */

import type { Booking, Driver } from '@/types';
import { formatPrice } from '@/lib/pricing/munich-tariff';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// =============================================================================
// NACHRICHTEN-TEMPLATES
// =============================================================================

/**
 * Formatiert die anonyme Gruppennachricht (Phase 1)
 * Enthält KEINE Kundendaten!
 */
export function formatAnonymousGroupMessage(booking: Booking): string {
  const pickupTime = format(new Date(booking.pickup_datetime), 'EEE, dd.MM. HH:mm', { locale: de });
  
  const vehicleEmojis: Record<string, string> = {
    standard: '🚕',
    xl: '🚐',
    luxury: '💎',
    wheelchair: '♿',
  };

  const lines = [
    `🚕 <b>NEUER AUFTRAG</b>`,
    ``,
    `📋 <b>Buchung:</b> #${booking.booking_number}`,
    `🕐 <b>Abholung:</b> ${pickupTime}`,
    `📍 <b>Stadtteil:</b> ${booking.pickup_district || 'München'}`,
    `${vehicleEmojis[booking.vehicle_type] || '🚕'} <b>Fahrzeug:</b> ${formatVehicleType(booking.vehicle_type)}`,
    `💶 <b>Preis:</b> ca. ${formatPrice(booking.price_total)}`,
  ];

  // Zuschläge anzeigen
  const surcharges: string[] = [];
  if (booking.passenger_count >= 5) surcharges.push('+5. Fahrgast');
  if (booking.has_bicycle) surcharges.push('+Fahrrad');
  if (surcharges.length > 0) {
    lines.push(`📌 <b>Zuschläge:</b> ${surcharges.join(', ')}`);
  }

  // Festpreis-Hinweis
  if (booking.fixed_route_type) {
    const routeNames: Record<string, string> = {
      airport_messe: 'Flughafen ↔ Messe',
      hbf_airport: 'Hbf ↔ Flughafen',
      hbf_messe: 'Hbf ↔ Messe',
    };
    lines.push(`🏷️ <b>Festpreis:</b> ${routeNames[booking.fixed_route_type]}`);
  }

  lines.push('');
  lines.push('⬇️ <i>Zum Annehmen Button drücken</i>');

  return lines.join('\n');
}

/**
 * Formatiert die private Nachricht an den Fahrer (Phase 3)
 * Enthält ALLE Kundendaten!
 */
export function formatPrivateDriverMessage(booking: Booking): string {
  const pickupTime = format(new Date(booking.pickup_datetime), 'EEEE, dd.MM.yyyy HH:mm', { locale: de });

  const lines = [
    `✅ <b>AUFTRAG BESTÄTIGT</b>`,
    ``,
    `📋 <b>Buchung:</b> #${booking.booking_number}`,
    `🕐 <b>Abholung:</b> ${pickupTime}`,
    ``,
    `👤 <b>Kunde:</b> ${booking.customer_name || 'Nicht angegeben'}`,
    `📞 <b>Telefon:</b> ${booking.customer_phone ? `<a href="tel:${booking.customer_phone}">${booking.customer_phone}</a>` : 'Nicht angegeben'}`,
    ``,
    `📍 <b>Abholadresse:</b>`,
    `<code>${booking.pickup_address}</code>`,
    ``,
  ];

  if (booking.destination_address) {
    lines.push(`🏁 <b>Zieladresse:</b>`);
    lines.push(`<code>${booking.destination_address}</code>`);
    lines.push('');
  } else {
    lines.push(`🏁 <b>Zieladresse:</b> Wird vom Kunden genannt`);
    lines.push('');
  }

  lines.push(`💶 <b>Preis:</b> ${formatPrice(booking.price_total)}`);
  
  if (booking.fixed_route_type) {
    lines.push(`<i>(Festpreis)</i>`);
  }

  if (booking.payment_method === 'cash') {
    lines.push(`💵 <b>Zahlung:</b> Bar`);
  } else if (booking.payment_method === 'card') {
    lines.push(`💳 <b>Zahlung:</b> Karte`);
  } else if (booking.payment_method === 'invoice') {
    lines.push(`📄 <b>Zahlung:</b> Rechnung`);
  }

  if (booking.customer_notes) {
    lines.push('');
    lines.push(`📝 <b>Notizen:</b>`);
    lines.push(booking.customer_notes);
  }

  lines.push('');
  lines.push(`<i>Gute Fahrt! 🚕</i>`);

  return lines.join('\n');
}

/**
 * Formatiert eine Stornierungsbenachrichtigung
 */
export function formatCancellationMessage(booking: Booking, reason?: string): string {
  const lines = [
    `❌ <b>FAHRT STORNIERT</b>`,
    ``,
    `📋 <b>Buchung:</b> #${booking.booking_number}`,
    `📍 <b>Abholung:</b> ${booking.pickup_district || 'München'}`,
  ];

  if (reason) {
    lines.push('');
    lines.push(`<b>Grund:</b> ${reason}`);
  }

  return lines.join('\n');
}

// =============================================================================
// BUTTONS & KEYBOARDS
// =============================================================================

/**
 * Erstellt den "Annehmen"-Button für die Gruppennachricht
 */
export function createClaimButton(bookingId: string): {
  inline_keyboard: Array<Array<{
    text: string;
    callback_data: string;
  }>>;
} {
  return {
    inline_keyboard: [
      [
        {
          text: '✅ ANNEHMEN',
          callback_data: `claim:${bookingId}`,
        },
      ],
    ],
  };
}

/**
 * Erstellt den deaktivierten Button nach erfolgreichem Claim
 */
export function createDisabledClaimButton(claimerName: string): {
  inline_keyboard: Array<Array<{
    text: string;
    callback_data: string;
  }>>;
} {
  return {
    inline_keyboard: [
      [
        {
          text: `❌ Bereits vergeben an ${claimerName}`,
          callback_data: 'already_claimed',
        },
      ],
    ],
  };
}

// =============================================================================
// HILFSFUNKTIONEN
// =============================================================================

function formatVehicleType(type: string): string {
  const types: Record<string, string> = {
    standard: 'Standard (bis 4 Pers.)',
    xl: 'XL (bis 6 Pers.)',
    luxury: 'Luxus/Business',
    wheelchair: 'Rollstuhlgerecht',
  };
  return types[type] || type;
}

/**
 * Escaped HTML-Sonderzeichen für Telegram
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =============================================================================
// API-WRAPPER
// =============================================================================

/**
 * Sendet eine Nachricht an eine Telegram-Gruppe
 */
export async function sendGroupMessage(
  botToken: string,
  groupId: number | string,
  booking: Booking
): Promise<{ message_id: number }> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: groupId,
      text: formatAnonymousGroupMessage(booking),
      parse_mode: 'HTML',
      reply_markup: createClaimButton(booking.id),
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }

  return { message_id: data.result.message_id };
}

/**
 * Sendet private Kundendaten an den Fahrer
 */
export async function sendPrivateDriverMessage(
  botToken: string,
  chatId: number,
  booking: Booking
): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatPrivateDriverMessage(booking),
      parse_mode: 'HTML',
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }
}

/**
 * Aktualisiert die Gruppennachricht nach Claim
 */
export async function updateGroupMessage(
  botToken: string,
  groupId: number | string,
  messageId: number,
  booking: Booking,
  claimerName: string
): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: groupId,
      message_id: messageId,
      text: formatAnonymousGroupMessage(booking) + `\n\n🔒 <b>Vergeben an:</b> ${claimerName}`,
      parse_mode: 'HTML',
      reply_markup: createDisabledClaimButton(claimerName),
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }
}

/**
 * Löscht eine Nachricht aus der Gruppe
 */
export async function deleteGroupMessage(
  botToken: string,
  groupId: number | string,
  messageId: number
): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: groupId,
      message_id: messageId,
    }),
  });

  // Ignoriere Fehler (z.B. wenn Nachricht bereits gelöscht)
  if (!response.ok) {
    console.warn('Could not delete message:', await response.text());
  }
}
