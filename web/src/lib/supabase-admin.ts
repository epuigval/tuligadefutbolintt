import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en variables de entorno.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function assertAdminKey(adminKey: string | undefined): void {
  const expected = process.env.ADMIN_ACTION_KEY;
  if (!expected) {
    throw new Error("Falta ADMIN_ACTION_KEY en variables de entorno.");
  }

  if (!adminKey || adminKey !== expected) {
    throw new Error("ADMIN_ACTION_KEY no valida.");
  }
}