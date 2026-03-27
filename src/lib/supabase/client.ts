/**
 * SUPABASE CLIENT
 * Sicherer Client für Browser-seitige Abfragen
 * 
 * ⚠️ WICHTIG: Service-Role-Key ist NICHT im Client enthalten!
 * Admin-Operationen laufen über Edge Functions.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Umgebungsvariablen - nur Anon Key für Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validierung
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Fehlende Umgebungsvariablen: VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY');
}

/**
 * Supabase Client für Browser-Anwendungen
 * Verwendet nur Anon Key mit RLS-Policies
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-application-name': 'taxi-center-ost',
    },
  },
});

/**
 * Setzt den Mandanten-Kontext für RLS
 * @param tenantId - UUID des Mandanten
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  try {
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
  } catch (error) {
    console.error('[Supabase] Fehler beim Setzen des Tenant Context:', error);
    throw new Error('Failed to set tenant context');
  }
}

/**
 * Setzt den Actor-Kontext für Audit-Logs
 * @param actorType - Typ des Akteurs (driver, admin, system)
 * @param actorId - UUID des Akteurs
 */
export async function setActorContext(
  actorType: 'driver' | 'admin' | 'system' | 'telegram_bot',
  actorId: string
): Promise<void> {
  try {
    await supabase.rpc('set_actor_context', { 
      actor_type: actorType, 
      actor_id: actorId 
    });
  } catch (error) {
    console.error('[Supabase] Fehler beim Setzen des Actor Context:', error);
    throw new Error('Failed to set actor context');
  }
}

/**
 * Typ-Helper für Typed Supabase Client
 */
export type TypedSupabaseClient = typeof supabase;
