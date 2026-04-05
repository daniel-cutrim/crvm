// Type declarations for Deno Edge Functions
// These suppress VS Code TypeScript errors for Deno-specific APIs

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.38.4" {
  export { createClient } from "@supabase/supabase-js";
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
