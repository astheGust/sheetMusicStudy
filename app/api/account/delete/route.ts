import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type DeleteAccountRequest = {
  email?: unknown
  confirmation?: unknown
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization')
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) {
    return Response.json({ error: 'Autenticação necessária.' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return Response.json(
      { error: 'Exclusão indisponível: configure SUPABASE_SERVICE_ROLE_KEY no servidor.' },
      { status: 503 },
    )
  }

  let body: DeleteAccountRequest
  try {
    body = (await request.json()) as DeleteAccountRequest
  } catch {
    return Response.json({ error: 'Solicitação inválida.' }, { status: 400 })
  }

  if (typeof body.email !== 'string' || body.email.length > 254) {
    return Response.json({ error: 'Confirme o e-mail da conta.' }, { status: 400 })
  }
  if (body.confirmation !== 'CONFIRMAR') {
    return Response.json({ error: 'Confirmação textual inválida.' }, { status: 400 })
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken)
  if (userError || !userData.user) {
    return Response.json({ error: 'Sessão inválida ou expirada. Entre novamente.' }, { status: 401 })
  }

  if (userData.user.email?.toLocaleLowerCase() !== body.email.trim().toLocaleLowerCase()) {
    return Response.json({ error: 'O e-mail informado não corresponde à conta atual.' }, { status: 400 })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id)
  if (deleteError) {
    return Response.json(
      { error: `Não foi possível excluir a conta: ${deleteError.message}` },
      { status: 502 },
    )
  }

  return Response.json({ deleted: true })
}
