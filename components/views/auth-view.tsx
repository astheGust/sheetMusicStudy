'use client'

import { ArrowLeft, Eye, EyeOff, KeyRound, Music2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Capacitor } from '@capacitor/core'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '../ui/button'

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password'

export function AuthView({
  recovery = false,
  loginPrompt = false,
  onRecoveryComplete,
}: {
  recovery?: boolean
  loginPrompt?: boolean
  onRecoveryComplete: () => void
}) {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [signupConfirmation, setSignupConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (!recovery && mode === 'sign-up' && password !== signupConfirmation) {
      setError('As senhas não coincidem.')
      return
    }
    setBusy(true)

    try {
      if (recovery) {
        if (password !== confirmation) {
          setError('As senhas não coincidem.')
          return
        }
        const { error: updateError } = await getSupabaseClient().auth.updateUser({ password })
        if (updateError) throw updateError
        setMessage('Senha alterada. Sua sessão está ativa.')
        onRecoveryComplete()
        return
      }

      if (mode === 'sign-in') {
        const { error: signInError } = await getSupabaseClient().auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      } else if (mode === 'sign-up') {
        const { data, error: signUpError } = await getSupabaseClient().auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: Capacitor.isNativePlatform()
              ? 'com.gustavo.partituras://auth/verified'
              : `${window.location.origin}/auth/verified`,
          },
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setMessage('Confira seu e-mail para confirmar a conta e depois entre.')
        }
      } else {
        const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (resetError) throw resetError
        setMessage('Se esse e-mail estiver cadastrado, enviaremos um link para redefinir a senha.')
      }
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Não foi possível concluir a solicitação. Tente novamente.',
      )
    } finally {
      setBusy(false)
    }
  }

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError(null)
    setMessage(null)
    setSignupConfirmation('')
    setShowPassword(false)
  }

  const title = recovery
    ? 'Crie uma nova senha'
    : mode === 'sign-in'
      ? 'Boas-vindas de volta'
      : mode === 'sign-up'
        ? 'Crie sua conta'
        : 'Recuperar senha'

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Music2 className="size-5" />
          </div>
          <span className="font-serif text-2xl tracking-tight">Cadenza</span>
        </div>

        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {recovery
            ? 'Escolha uma senha nova para sua conta.'
            : loginPrompt
              ? 'Entre ou crie sua conta para salvar partituras, pastas e anotações.'
            : mode === 'forgot-password'
              ? 'Enviaremos um link de recuperação para seu e-mail.'
              : mode === 'sign-up'
                ? 'Salve seu repertório e acompanhe seu estudo.'
                : 'Entre para acessar seu espaço de estudo.'}
        </p>

        <form onSubmit={run} className="mt-6 flex flex-col gap-4">
          {!recovery && mode !== 'forgot-password' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-email" className="text-sm font-medium">E-mail</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/25"
              />
            </div>
          )}

          {!recovery && mode === 'forgot-password' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="recovery-email" className="text-sm font-medium">E-mail</label>
              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/25"
              />
            </div>
          )}

          {!recovery && mode !== 'forgot-password' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-password" className="text-sm font-medium">Senha</label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                  required
                  minLength={mode === 'sign-up' ? 8 : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10 w-full rounded-lg border bg-background px-3 pr-11 text-sm outline-none focus:ring-3 focus:ring-ring/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          )}

          {!recovery && mode === 'sign-up' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-signup-confirmation" className="text-sm font-medium">Confirme sua senha</label>
              <div className="relative">
                <input
                  id="auth-signup-confirmation"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={signupConfirmation}
                  onChange={(event) => setSignupConfirmation(event.target.value)}
                  className="h-10 w-full rounded-lg border bg-background px-3 pr-11 text-sm outline-none focus:ring-3 focus:ring-ring/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          )}
          {recovery && (
            <>
              <PasswordField
                id="new-password"
                label="Nova senha"
                value={password}
                onChange={setPassword}
              />
              <PasswordField
                id="confirm-password"
                label="Confirme a nova senha"
                value={confirmation}
                onChange={setConfirmation}
              />
            </>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="rounded-lg border border-mastered/25 bg-mastered/10 px-3 py-2 text-sm text-mastered">
              {message}
            </p>
          )}

          <Button type="submit" disabled={busy} className="h-10 w-full rounded-full">
            <KeyRound />
            {busy
              ? 'Aguarde…'
              : recovery
                ? 'Salvar nova senha'
                : mode === 'sign-in'
                  ? 'Entrar'
                  : mode === 'sign-up'
                    ? 'Criar conta'
                    : 'Enviar link de recuperação'}
          </Button>
        </form>

        {!recovery && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            {mode === 'sign-in' ? (
              <>
                <button type="button" onClick={() => changeMode('forgot-password')} className="text-muted-foreground hover:text-foreground">
                  Esqueci minha senha
                </button>
                <button type="button" onClick={() => changeMode('sign-up')} className="font-medium text-primary hover:underline">
                  Criar conta
                </button>
              </>
            ) : (
              <button type="button" onClick={() => changeMode('sign-in')} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" />
                Voltar para entrar
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input
        id={id}
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/25"
      />
    </div>
  )
}
