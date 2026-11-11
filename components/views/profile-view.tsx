'use client'

import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { AlertTriangle, Eye, EyeOff, LogOut, Trash2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '../ui/button'

export function ProfileView({
  user,
  onDisplayNameChange,
  onSignOutRequest,
  onAccountDeleted,
}: {
  user: User
  onDisplayNameChange: (displayName: string) => void
  onSignOutRequest: () => void
  onAccountDeleted: (userId: string) => Promise<void>
}) {
  const [displayName, setDisplayName] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [showDeletePassword, setShowDeletePassword] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteStage, setDeleteStage] = useState<'credentials' | 'confirmation'>('credentials')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  useEffect(() => {
    let active = true

    const loadProfile = async () => {
      setLoadingProfile(true)
      setProfileError(null)
      try {
        const { data, error } = await getSupabaseClient()
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()
        if (!active) return
        if (error) {
          setProfileError(`Não foi possível carregar o perfil: ${error.message}`)
          return
        }
        setDisplayName(data.display_name)
      } catch (loadError) {
        if (active) {
          setProfileError(
            loadError instanceof Error
              ? `Não foi possível carregar o perfil: ${loadError.message}`
              : 'Não foi possível carregar o perfil.',
          )
        }
      } finally {
        if (active) setLoadingProfile(false)
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [user.id])

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingProfile(true)
    setProfileError(null)
    setProfileMessage(null)
    try {
      const { error } = await getSupabaseClient()
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', user.id)
      if (error) throw error
      onDisplayNameChange(displayName.trim())
      setProfileMessage('Perfil atualizado.')
    } catch (saveError) {
      setProfileError(
        saveError instanceof Error
          ? `Não foi possível salvar o perfil: ${saveError.message}`
          : 'Não foi possível salvar o perfil.',
      )
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError(null)
    setPasswordMessage(null)
    if (password !== confirmation) {
      setPasswordError('As senhas não coincidem.')
      return
    }
    if (!user.email) {
      setPasswordError('Não foi possível confirmar a conta: ela não possui e-mail associado.')
      return
    }

    setChangingPassword(true)
    try {
      const supabase = getSupabaseClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) throw new Error(`Confirmação da senha atual falhou: ${signInError.message}`)

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setCurrentPassword('')
      setPassword('')
      setConfirmation('')
      setPasswordMessage('Senha alterada com sucesso.')
    } catch (changeError) {
      setPasswordError(
        changeError instanceof Error
          ? `Não foi possível alterar a senha: ${changeError.message}`
          : 'Não foi possível alterar a senha.',
      )
    } finally {
      setChangingPassword(false)
    }
  }

  const verifyDeleteCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDeleteError(null)
    if (deleteEmail.trim().toLocaleLowerCase() !== user.email?.toLocaleLowerCase()) {
      setDeleteError('Digite o e-mail da sua conta para confirmar.')
      return
    }

    setDeletingAccount(true)
    try {
      const { data, error } = await getSupabaseClient().auth.signInWithPassword({
        email: user.email ?? '',
        password: deletePassword,
      })
      if (error) throw new Error(`Confirmação de senha falhou: ${error.message}`)
      if (!data.session) throw new Error('Não foi possível confirmar a sessão da conta.')
      setDeleteStage('confirmation')
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Não foi possível validar seus dados. Tente novamente.',
      )
    } finally {
      setDeletingAccount(false)
    }
  }

  const confirmDeleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDeleteError(null)
    if (deleteConfirmation !== 'CONFIRMAR') {
      setDeleteError('Digite CONFIRMAR exatamente como aparece para continuar.')
      return
    }
    if (deleteEmail.trim().toLocaleLowerCase() !== user.email?.toLocaleLowerCase()) {
      setDeleteError('Digite o e-mail da sua conta para confirmar.')
      return
    }

    setDeletingAccount(true)
    try {
      const supabase = getSupabaseClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      })
      if (signInError) throw new Error(`Confirmação de senha falhou: ${signInError.message}`)
      if (!data.session) throw new Error('Não foi possível confirmar a sessão da conta.')

      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email, confirmation: deleteConfirmation }),
      })
      const result = (await response.json()) as { error?: string; deleted?: boolean }
      if (!response.ok || !result.deleted) {
        throw new Error(result.error ?? 'O servidor não confirmou a exclusão da conta.')
      }

      await onAccountDeleted(user.id)
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Não foi possível excluir a conta. Tente novamente.',
      )
      setDeletingAccount(false)
    }
  }

  const closeDeleteDialog = () => {
    if (deletingAccount) return
    setDeleteDialogOpen(false)
    setDeleteEmail('')
    setDeletePassword('')
    setShowDeletePassword(false)
    setDeleteError(null)
    setDeleteStage('credentials')
    setDeleteConfirmation('')
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Conta</p>
        <h1 className="mt-1 text-3xl font-medium tracking-tight">Seu perfil</h1>
      </header>

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="font-medium">Informações pessoais</h2>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        <form onSubmit={saveProfile} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-name" className="text-sm font-medium">Nome de exibição</label>
            <input
              id="profile-name"
              autoComplete="name"
              maxLength={80}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={loadingProfile}
              className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/25 disabled:opacity-60"
            />
          </div>
          {profileError && <p role="alert" className="text-sm text-destructive">{profileError}</p>}
          {profileMessage && <p role="status" className="text-sm text-mastered">{profileMessage}</p>}
          <Button type="submit" disabled={loadingProfile || savingProfile} className="self-start rounded-full px-5">
            {savingProfile ? 'Salvando…' : 'Salvar perfil'}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="font-medium">Segurança</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirme sua senha atual antes de definir uma nova.
        </p>
        <form onSubmit={changePassword} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-current-password" className="text-sm font-medium">Senha atual</label>
            <div className="relative max-w-md">
              <input
                id="profile-current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="h-10 w-full rounded-lg border bg-background px-3 pr-11 text-sm outline-none focus:ring-3 focus:ring-ring/25"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
                aria-label={showCurrentPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showCurrentPassword}
              >
                {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <PasswordField
            id="profile-password"
            label="Nova senha"
            value={password}
            onChange={setPassword}
          />
          <PasswordField
            id="profile-password-confirm"
            label="Confirme a nova senha"
            value={confirmation}
            onChange={setConfirmation}
          />
          {passwordError && <p role="alert" className="text-sm text-destructive">{passwordError}</p>}
          {passwordMessage && <p role="status" className="text-sm text-mastered">{passwordMessage}</p>}
          <Button type="submit" variant="outline" disabled={changingPassword} className="self-start rounded-full px-5">
            {changingPassword ? 'Alterando…' : 'Alterar senha'}
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-medium">Sessão</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Encerre sua sessão neste dispositivo.
          </p>
        </div>
        <Button type="button" variant="outline" className="self-start rounded-full sm:self-auto" onClick={onSignOutRequest}>
          <LogOut /> Sair da conta
        </Button>
      </section>

      <section className="rounded-2xl border border-destructive/30 bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="min-w-0">
            <h2 className="font-medium">Zona de risco</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Exclui permanentemente a conta e os dados associados. Opção destinada a testes.
            </p>
            <Button
              type="button"
              variant="destructive"
              className="mt-4 rounded-full"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 /> Excluir conta
            </Button>
          </div>
        </div>
      </section>

      {deleteDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center sm:p-4"
        >
          <form
            onSubmit={deleteStage === 'credentials' ? verifyDeleteCredentials : confirmDeleteAccount}
            className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-destructive/30 bg-card p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6"
          >
            <h2 id="delete-account-title" className="text-xl font-medium">
              {deleteStage === 'credentials' ? 'Excluir sua conta?' : 'Confirmação final'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {deleteStage === 'credentials'
                ? 'Essa ação não pode ser desfeita. Seu perfil, partituras, pastas e anotações na nuvem serão apagados. Primeiro, confirme sua identidade.'
                : <>Para enviar a solicitação de exclusão, digite <span className="font-bold text-red-500">"CONFIRMAR"</span> no campo abaixo. A conta e seus dados associados serão apagados permanentemente.</>}
            </p>
            {deleteStage === 'credentials' ? (
              <div className="mt-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="delete-account-email" className="text-sm font-medium">
                    E-mail da conta
                  </label>
                  <input
                    id="delete-account-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={deleteEmail}
                    onChange={(event) => setDeleteEmail(event.target.value)}
                    className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/25"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="delete-account-password" className="text-sm font-medium">
                    Senha atual
                  </label>
                  <div className="relative">
                    <input
                      id="delete-account-password"
                      type={showDeletePassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={deletePassword}
                      onChange={(event) => setDeletePassword(event.target.value)}
                      className="h-10 w-full rounded-lg border bg-background px-3 pr-11 text-sm outline-none focus:ring-3 focus:ring-ring/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword((visible) => !visible)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
                      aria-label={showDeletePassword ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-pressed={showDeletePassword}
                    >
                      {showDeletePassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-1.5">
                <label htmlFor="delete-account-confirmation" className="text-sm font-medium">
                  Digite <span className="font-bold text-red-500">"CONFIRMAR"</span>
                </label>
                <input
                  id="delete-account-confirmation"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  required
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/25"
                />
              </div>
            )}
            {deleteError && (
              <p role="alert" className="mt-4 text-sm text-destructive">{deleteError}</p>
            )}
            <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={closeDeleteDialog} disabled={deletingAccount}>
                Cancelar
              </Button>
              {deleteStage === 'confirmation' && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={deletingAccount}
                  onClick={() => {
                    setDeleteStage('credentials')
                    setDeleteConfirmation('')
                    setDeleteError(null)
                  }}
                >
                  Voltar
                </Button>
              )}
              <Button
                type="submit"
                variant={deleteStage === 'credentials' ? 'default' : 'destructive'}
                disabled={deletingAccount}
              >
                {deletingAccount
                  ? deleteStage === 'credentials'
                    ? 'Verificando…'
                    : 'Excluindo…'
                  : deleteStage === 'credentials'
                    ? 'Continuar'
                    : 'Excluir conta permanentemente'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
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
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className="relative max-w-md">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-lg border bg-background px-3 pr-11 text-sm outline-none focus:ring-3 focus:ring-ring/25"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}
