/**
 * TELEGRAM SERVICE
 * Service für die Integration mit der Telegram Bot API
 */

import type { Booking } from '@/types';
import { formatPrice } from '@/lib/pricing/munich-tariff';

interface TelegramConfig {
  botToken: string;
  groupId: number;
}

interface TelegramMessage {
  message_id: number;
  chat: {
    id: number;
  };
}

/**
 * Service-Klasse für Telegram-Operationen
 */
export class TelegramService {
  private botToken: string;
  private groupId: number;
  private baseUrl: string;

  constructor(config: TelegramConfig) {
    this.botToken = config.botToken;
    this.groupId = config.groupId;
    this.baseUrl = `https://api.telegram.org/bot${config.botToken}`;
  }

  /**
   * Sendet eine anonyme Buchung an die Telegram-Gruppe
   */
  async sendAnonymousBooking(booking: Booking): Promise<{ messageId: number }> {
    const text = this.formatAnonymousMessage(booking);
    const replyMarkup = this.createClaimButton(booking.id);

    const response = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.groupId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API Fehler: ${error}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API Fehler: ${data.description}`);
    }

    return { messageId: data.result.message_id };
  }

  /**
   * Sendet Kundendaten als private Nachricht an den Fahrer
   */
  async sendPrivateDetails(
    chatId: number,
    booking: Booking
  ): Promise<void> {
    const text = this.formatPrivateMessage(booking);

    const response = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API Fehler: ${error}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API Fehler: ${data.description}`);
    }
  }

  /**
   * Aktualisiert die Gruppennachricht nach Claim
   */
  async updateGroupMessage(
    messageId: number,
    booking: Booking,
    claimerName: string
  ): Promise<void> {
    const text = this.formatAnonymousMessage(booking) + 
      `\n\n🔒 <b>Vergeben an:</b> ${this.escapeHtml(claimerName)}`;
    
    const replyMarkup = this.createDisabledButton(claimerName);

    const response = await fetch(`${this.baseUrl}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.groupId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });

    if (!response.ok) {
      console.warn('Konnte Nachricht nicht aktualisieren:', await response.text());
    }
  }

  /**
   * Löscht eine Nachricht aus der Gruppe
   */
  async deleteMessage(messageId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.groupId,
        message_id: messageId,
      }),
    });

    if (!response.ok) {
      console.warn('Konnte Nachricht nicht löschen:', await response.text());
    }
  }

  /**
   * Validiert den Bot-Token
   */
  async validateToken(): Promise<{ valid: boolean; botName?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const data = await response.json();

      if (data.ok) {
        return { valid: true, botName: data.result.username };
      }

      return { valid: false, error: data.description };
    } catch (error) {
      return { valid: false, error: 'Verbindungsfehler' };
    }
  }

  // ========================================================================
  // PRIVATE HILFSMETHODEN
  // ========================================================================

  private formatAnonymousMessage(booking: Booking): string {
    const pickupTime = new Date(booking.pickup_datetime).toLocaleString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

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
      `${vehicleEmojis[booking.vehicle_type] || '🚕'} <b>Fahrzeug:</b> ${this.formatVehicleType(booking.vehicle_type)}`,
      `💶 <b>Preis:</b> ca. ${formatPrice(booking.price_total)}`,
    ];

    if (booking.fixed_route_type) {
      const routes: Record<string, string> = {
        airport_messe: 'Flughafen ↔ Messe',
        hbf_airport: 'Hbf ↔ Flughafen',
        hbf_messe: 'Hbf ↔ Messe',
      };
      lines.push(`🏷️ <b>Festpreis:</b> ${routes[booking.fixed_route_type]}`);
    }

    lines.push('');
    lines.push('⬇️ <i>Zum Annehmen Button drücken</i>');

    return lines.join('\n');
  }

  private formatPrivateMessage(booking: Booking): string {
    const pickupTime = new Date(booking.pickup_datetime).toLocaleString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const lines = [
      `✅ <b>AUFTRAG BESTÄTIGT</b>`,
      ``,
      `📋 <b>Buchung:</b> #${booking.booking_number}`,
      `🕐 <b>Abholung:</b> ${pickupTime}`,
      ``,
      `👤 <b>Kunde:</b> ${this.escapeHtml(booking.customer_name || 'Nicht angegeben')}`,
      `📞 <b>Telefon:</b> ${booking.customer_phone ? `<a href="tel:${booking.customer_phone}">${booking.customer_phone}</a>` : 'Nicht angegeben'}`,
      ``,
      `📍 <b>Abholadresse:</b>`,
      `<code>${this.escapeHtml(booking.pickup_address)}</code>`,
      ``,
    ];

    if (booking.destination_address) {
      lines.push(`🏁 <b>Zieladresse:</b>`);
      lines.push(`<code>${this.escapeHtml(booking.destination_address)}</code>`);
      lines.push('');
    }

    lines.push(`💶 <b>Preis:</b> ${formatPrice(booking.price_total)}`);

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
      lines.push(this.escapeHtml(booking.customer_notes));
    }

    lines.push('');
    lines.push(`<i>Gute Fahrt! 🚕</i>`);

    return lines.join('\n');
  }

  private createClaimButton(bookingId: string): string {
    return JSON.stringify({
      inline_keyboard: [
        [
          {
            text: '✅ ANNEHMEN',
            callback_data: `claim:${bookingId}`,
          },
        ],
      ],
    });
  }

  private createDisabledButton(claimerName: string): string {
    return JSON.stringify({
      inline_keyboard: [
        [
          {
            text: `❌ Bereits vergeben an ${claimerName}`,
            callback_data: 'already_claimed',
          },
        ],
      ],
    });
  }

  private formatVehicleType(type: string): string {
    const types: Record<string, string> = {
      standard: 'Standard (bis 4 Pers.)',
      xl: 'XL (bis 6 Pers.)',
      luxury: 'Luxus/Business',
      wheelchair: 'Rollstuhlgerecht',
    };
    return types[type] || type;
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
