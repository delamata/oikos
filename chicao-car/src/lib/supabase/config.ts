export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * O app funciona em dois modos:
 *  - `supabase`: quando as variáveis de ambiente estão preenchidas (produção);
 *  - `local`:    demonstração, com dados no próprio navegador.
 * A chave `service_role` nunca é usada no frontend.
 */
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;
