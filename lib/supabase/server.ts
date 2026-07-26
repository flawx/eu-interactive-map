import "server-only";

import {
  createSupabaseServiceClient,
} from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the secret / service role key.
 * Never import this module from Client Components.
 */
export function getSupabaseServerClient(): SupabaseClient {
  return createSupabaseServiceClient();
}
