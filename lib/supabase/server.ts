// //Supabase server client (for API routes)
// // ============================================================

// import { createServerClient, type CookieOptions } from '@supabase/ssr';
// import { cookies } from 'next/headers';
// import type { Database } from '@/types/database';

// export function createClient() {
//   const cookieStore = cookies();

//   return createServerClient<Database>(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         get(name: string) {
//           return cookieStore.get(name)?.value;
//         },
//         set(name: string, value: string, options: CookieOptions) {
//           try {
//             cookieStore.set({ name, value, ...options });
//           } catch (error) {
//             // Server component - can't set cookies
//           }
//         },
//         remove(name: string, options: CookieOptions) {
//           try {
//             cookieStore.set({ name, value: '', ...options });
//           } catch (error) {
//             // Server component - can't remove cookies
//           }
//         },
//       },
//     }
//   );
// }

// export function createServiceClient() {
//   return createServerClient<Database>(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!,
//     {
//       cookies: {
//         get() { return undefined; },
//         set() { },
//         remove() { },
//       },
//     }
//   );
// }


// lib/supabase/server.ts
// ============================================================

// FILE: lib/supabase/server.ts
// ============================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Authenticated server client (App Router)
 * MUST be async because cookies() is async
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // DO NOT set/remove cookies here
        set() {},
        remove() {},
      },
    }
  );
}

/**
 * Service role client (admin / background jobs)
 * NO cookies
 */
export function createServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() {
          return undefined;
        },
        set() {},
        remove() {},
      },
    }
  );
}
