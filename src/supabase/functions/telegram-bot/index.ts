/**
 * TELEGRAM BOT EDGE FUNCTION
 * Zweistufiger Workflow für Taxi-Auftragsvermittlung
 * 
 * Phase 1: Anonyme Nachricht in Gruppe (ID, Zeit, Stadtteil, Preis)
 * Phase 2: Fahrer drückt "Annehmen" → Claim
 * Phase 3: Private Nachricht mit Kundendaten an Fahrer
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// =============================================================================
// KONFIGURATION
// =============================================================================

interface Config {
  supabaseUrl: string;
  supabaseServiceKey: string;
  telegramBotToken: string;
}

function getConfig(): Config {
  return {
    supabaseUrl: Deno.env.get('SUPABASE_URL') || '',
    supabaseServiceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    telegramBotToken: Deno.env.get('TELEGRAM_BOT_TOKEN') || '',
  };
}

// =============================================================================
// TELEGRAM API HILFSFUNKTIONEN
// =============================================================================

async function telegramApiCall(
  token: string,
  method: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }

  return data.result;
}

async function sendTelegramMessage(
  token: string,
  chatId: number | string,
  text: string,
  options: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: unknown;
    replyToMessageId?: number;
  } = {}
): Promise<{ message_id: number }> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
  };

  if (options.parseMode) {
    payload.parse_mode = options.parseMode;
  }

  if (options.replyMarkup) {
    payload.reply_markup = JSON.stringify(options.replyMarkup);
  }

  if (options.replyToMessageId) {
    payload.reply_to_message_id = options.replyToMessageId;
  }

  return await telegramApiCall(token, 'sendMessage', payload) as { message_id: number };
}

async function editTelegramMessage(
  token: string,
  chatId: number | string,
  messageId: number,
  text: string,
  options: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: unknown;
  } = {}
): Promise<void> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
  };

  if (options.parseMode) {
    payload.parse_mode = options.parseMode;
  }

  if (options.replyMarkup) {
    payload.reply_markup = JSON.stringify(options.replyMarkup);
  }

  await telegramApiCall(token, 'editMessageText', payload);
}

async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string,
  showAlert?: boolean
): Promise<void> {
  const payload: Record<string, unknown> = {
    callback_query_id: callbackQueryId,
  };

  if (text) {
    payload.text = text;
  }

  if (showAlert) {
    payload.show_alert = true;
  }

  await telegramApiCall(token, 'answerCallbackQuery', payload);
}

// =============================================================================
// DATENBANK-OPERATIONEN
// =============================================================================

interface Booking {
  id: string;
  tenant_id: string;
  booking_number: string;
  status: string;
  pickup_datetime: string;
  pickup_address: string;
  pickup_district: string;
  destination_address: string;
  price_total: number;
  vehicle_type: string;
  customer_name: string | null;
  customer_phone: string | null;
  telegram_message_id: number | null;
  assigned_driver_id: string | null;
}

interface Driver {
  id: string;
  tenant_id: string;
  telegram_user_id: number;
  telegram_chat_id: number;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

async function getBookingById(
  supabase: ReturnType<typeof createClient>,
  bookingId: string
): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (error || !data) {
    console.error('Error fetching booking:', error);
    return null;
  }

  return data as Booking;
}

async function getDriverByTelegramId(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  telegramUserId: number
): Promise<Driver | null> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('telegram_user_id', telegramUserId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error('Error fetching driver:', error);
    return null;
  }

  return data as Driver;
}

async function claimBooking(
  supabase: ReturnType<typeof createClient>,
  bookingId: string,
  driverId: string
): Promise<{ success: boolean; error?: string }> {
  // Verwende eine RPC-Funktion für atomare Operation
  const { data, error } = await supabase.rpc('claim_booking', {
    p_booking_id: bookingId,
    p_driver_id: driverId,
  });

  if (error) {
    console.error('Error claiming booking:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function createAuditLog(
  supabase: ReturnType<typeof createClient>,
  log: {
    tenant_id: string;
    actor_type: string;
    actor_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert([log]);

  if (error) {
    console.error('Error creating audit log:', error);
  }
}

// =============================================================================
// NACHRICHTEN-TEMPLATES
// =============================================================================

function formatAnonymousBookingMessage(booking: Booking): string {
  const pickupTime = new Date(booking.pickup_datetime).toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const priceFormatted = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(booking.price_total);

  return `
🚕 <b>NEUER AUFTRAG</b>

📋 <b>Buchung:</b> #${booking.booking_number}
🕐 <b>Abholung:</b> ${pickupTime}
📍 <b>Stadtteil:</b> ${booking.pickup_district || 'München'}
🚗 <b>Fahrzeug:</b> ${formatVehicleType(booking.vehicle_type)}
💶 <b>Preis:</b> ca. ${priceFormatted}

⬇️ <i>Zum Annehmen Button drücken</i>
  `.trim();
}

function formatPrivateDriverMessage(booking: Booking): string {
  const pickupTime = new Date(booking.pickup_datetime).toLocaleString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const priceFormatted = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(booking.price_total);

  return `
✅ <b>AUFTRAG BESTÄTIGT</b>

📋 <b>Buchung:</b> #${booking.booking_number}
🕐 <b>Abholung:</b> ${pickupTime}

👤 <b>Kunde:</b> ${booking.customer_name || 'Nicht angegeben'}
📞 <b>Telefon:</b> ${booking.customer_phone || 'Nicht angegeben'}

📍 <b>Abholadresse:</b>
${booking.pickup_address}

🏁 <b>Zieladresse:</b>
${booking.destination_address || 'Wird vom Kunde genannt'}

💶 <b>Preis:</b> ${priceFormatted}
🚗 <b>Fahrzeug:</b> ${formatVehicleType(booking.vehicle_type)}

<i>Gute Fahrt! 🚕</i>
  `.trim();
}

function formatVehicleType(type: string): string {
  const types: Record<string, string> = {
    standard: 'Standard (bis 4 Pers.)',
    xl: 'XL (bis 6 Pers.)',
    luxury: 'Luxus/Business',
    wheelchair: 'Rollstuhlgerecht',
  };
  return types[type] || type;
}

function createClaimButton(bookingId: string): unknown {
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

function createDisabledClaimButton(claimerName: string): unknown {
  return {
    inline_keyboard: [
      [
        {
          text: `❌ Bereits vergeben an ${claimerName}`,
          callback_data: 'ignore',
        },
      ],
    ],
  };
}

// =============================================================================
// WEBHANDLER
// =============================================================================

interface TelegramUpdate {
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

async function handleCallbackQuery(
  update: TelegramUpdate,
  config: Config,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const callbackQuery = update.callback_query!;
  const callbackData = callbackQuery.data;
  const telegramUserId = callbackQuery.from.id;

  // Ignoriere nicht-claim Callbacks
  if (!callbackData.startsWith('claim:')) {
    await answerCallbackQuery(config.telegramBotToken, callbackQuery.id);
    return;
  }

  const bookingId = callbackData.split(':')[1];

  // Hole Buchung
  const booking = await getBookingById(supabase, bookingId);
  if (!booking) {
    await answerCallbackQuery(
      config.telegramBotToken,
      callbackQuery.id,
      'Fehler: Buchung nicht gefunden.',
      true
    );
    return;
  }

  // Prüfe, ob Buchung noch verfügbar
  if (booking.status !== 'telegram_broadcast') {
    const claimedBy = booking.assigned_driver_id ? 'einem anderen Fahrer' : 'dem System';
    await answerCallbackQuery(
      config.telegramBotToken,
      callbackQuery.id,
      `Diese Fahrt wurde bereits von ${claimedBy} angenommen.`,
      true
    );
    return;
  }

  // Hole Fahrer
  const driver = await getDriverByTelegramId(supabase, booking.tenant_id, telegramUserId);
  if (!driver) {
    await answerCallbackQuery(
      config.telegramBotToken,
      callbackQuery.id,
      'Fehler: Du bist nicht als aktiver Fahrer registriert.',
      true
    );
    return;
  }

  // Versuche Buchung zu claimen
  const claimResult = await claimBooking(supabase, bookingId, driver.id);
  
  if (!claimResult.success) {
    await answerCallbackQuery(
      config.telegramBotToken,
      callbackQuery.id,
      'Diese Fahrt wurde gerade von einem anderen Fahrer angenommen.',
      true
    );
    return;
  }

  // Erfolgreich geclaimt
  await answerCallbackQuery(
    config.telegramBotToken,
    callbackQuery.id,
    '✅ Auftrag angenommen! Details folgen per Privatnachricht.',
    false
  );

  // Aktualisiere Gruppennachricht
  const driverName = `${driver.first_name} ${driver.last_name}`.trim();
  if (callbackQuery.message) {
    await editTelegramMessage(
      config.telegramBotToken,
      callbackQuery.message.chat.id,
      callbackQuery.message.message_id,
      formatAnonymousBookingMessage(booking) + `\n\n🔒 <b>Vergeben an:</b> ${driverName}`,
      {
        parseMode: 'HTML',
        replyMarkup: createDisabledClaimButton(driverName),
      }
    );
  }

  // Sende private Nachricht mit Kundendaten
  if (driver.telegram_chat_id) {
    await sendTelegramMessage(
      config.telegramBotToken,
      driver.telegram_chat_id,
      formatPrivateDriverMessage({
        ...booking,
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
      }),
      { parseMode: 'HTML' }
    );
  }

  // Audit-Log erstellen
  await createAuditLog(supabase, {
    tenant_id: booking.tenant_id,
    actor_type: 'driver',
    actor_id: driver.id,
    action: 'booking_claimed_telegram',
    entity_type: 'booking',
    entity_id: bookingId,
    old_values: { status: 'telegram_broadcast' },
    new_values: { status: 'claimed', assigned_driver_id: driver.id },
    metadata: {
      telegram_user_id: telegramUserId,
      telegram_message_id: callbackQuery.message?.message_id,
      brokerage_fee_percent: 5.0,
    },
  });

  console.log(`Booking ${bookingId} claimed by driver ${driver.id} (${driverName})`);
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    const config = getConfig();
    
    if (!config.telegramBotToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

    const update: TelegramUpdate = await req.json();
    console.log('Received update:', JSON.stringify(update, null, 2));

    // Handle Callback Query (Button clicks)
    if (update.callback_query) {
      await handleCallbackQuery(update, config, supabase);
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    // Handle reguläre Nachrichten (könnte für andere Features genutzt werden)
    if (update.message) {
      console.log('Received message:', update.message.text);
      // Hier könnten Befehle wie /start, /help, /status implementiert werden
    }

    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers, status: 500 }
    );
  }
});
