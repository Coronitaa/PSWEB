
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for browser/client-side operations (uses anon key)
export function createSupabaseClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Client for server-side admin operations (uses service_role key)
// IMPORTANT: Only use this in server-side code (Server Actions, API Routes)
// and ensure SUPABASE_SERVICE_ROLE_KEY is properly set in environment variables.
export function createSupabaseAdminClient(): SupabaseClient<Database> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. This key is required for admin operations.");
  }
  // Note: For server components or server-side rendering needing user context,
  // you'd use Supabase SSR helpers like createServerClient.
  // This admin client is specifically for bypassing RLS with service_role.
  // createBrowserClient can also be used server-side if you are passing the JWT,
  // but for service_role, this direct instantiation is common.
  // For true server components, you'd use `createServerClient` from `@supabase/ssr`.
  // This is more of a generic "admin client" for Node.js environments like Server Actions.
  
  // Re-using createBrowserClient structure but with service_role key.
  // In a pure Node.js environment (not Next.js server components), you might use `createClient` from `@supabase/supabase-js`.
  // However, to keep consistency with `@supabase/ssr` patterns, this is okay for Server Actions.
  return createBrowserClient<Database>(supabaseUrl, serviceRoleKey);
}
