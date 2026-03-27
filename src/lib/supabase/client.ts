/**
 * SUPABASE CLIENT
 * Konfiguration für Client- und Server-seitige Abfragen
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Umgebungsvariablen
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Client für Client-seitige Abfragen
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Service-Role Client (nur für Server-seitige Operationen)
export const getServiceRoleClient = () => {
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient<Database>(supabaseUrl, serviceRoleKey);
};

// Hilfsfunktion zum Setzen des Mandanten-Kontexts (RLS)
export function setTenantContext(tenantId: string) {
  return supabase.rpc('set_tenant_context', { tenant_id: tenantId });
}

// Hilfsfunktion zum Setzen des Actor-Kontexts (für Audit-Logs)
export function setActorContext(actorType: string, actorId: string) {
  return supabase.rpc('set_actor_context', { 
    actor_type: actorType, 
    actor_id: actorId 
  });
}
