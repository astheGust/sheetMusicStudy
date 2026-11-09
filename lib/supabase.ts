import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase: SupabaseClient | null = null

export function getSupabaseClient() {
  if (supabase) return supabase
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para habilitar o Supabase.',
    )
  }

  let url: URL
  try {
    url = new URL(supabaseUrl)
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL deve ser uma URL HTTP ou HTTPS válida.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL deve ser uma URL HTTP ou HTTPS válida.')
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })

  return supabase
}