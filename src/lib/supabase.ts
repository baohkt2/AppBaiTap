import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "./env";

let _client: ReturnType<typeof createClient> | null = null;

export function supabaseAdmin() {
  if (!_client) {
    const env = serverEnv();
    _client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}
