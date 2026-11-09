'use client'

import { CircleCheck, LoaderCircle, LogOut, Menu, UserRound, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { App } from '@capacitor/app'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { getSupabaseClient } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { AppSidebar } from './app-sidebar'
import { SearchBar } from './search-bar'
import { BoardView } from './views/board-view'
import { CompareView } from './views/compare-view'
import { DetailView } from './views/detail-view'
import { HomeView } from './views/home-view'
import { LibraryView } from './views/library-view'
import { MuseScoreView } from './views/musescore-view'
import { PdfUploadView } from './views/pdf-upload-view'
import { AuthView } from './views/auth-view'
import { ProfileView } from './views/profile-view'
import { StudyView } from './views/study-view'
import { StatusSetupView } from './views/status-setup-view'
import { MuseScoreSelectionView } from './views/musescore-selection-view'

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [authState, setAuthState] = useState<'loading' | 'ready'>('loading')
  const [authError, setAuthError] = useState<string | null>(null)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [authViewOpen, setAuthViewOpen] = useState(false)
  const [signOutConfirmationOpen, setSignOutConfirmationOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [profileDisplayName, setProfileDisplayName] = useState('')
  const [profileNameUserId, setProfileNameUserId] = useState<string | null>(null)
  const [profileNameError, setProfileNameError] = useState<string | null>(null)
  const [profileRetry, setProfileRetry] = useState(0)
  const [statusSetup, setStatusSetup] = useState<{ userId: string; complete: boolean | null } | null>(null)
  const [statusSetupError, setStatusSetupError] = useState<string | null>(null)
  const [searchClearToken, setSearchClearToken] = useState(0)
  const initializedByAuthEvent = useRef(false)
  const {
    notify,
    navigate,
    view,
    configureAuthGuard,
    syncState,
    accountError,
    retryAccountData,
    clearAccountData,
    back,
    canGoBack,
  } = useStore()
  const requestLogin = useCallback(() => setAuthViewOpen(true), [])
  const clearSearchAfterScoreAdded = useCallback(() => setSearchClearToken((token) => token + 1), [])
  const nativeBackState = useRef({
    mobileOpen,
    searchOpen,
    signOutConfirmationOpen,
    authViewOpen,
    passwordRecovery,
    canGoBack,
    back,
  })
  nativeBackState.current = {
    mobileOpen,
    searchOpen,
    signOutConfirmationOpen,
    authViewOpen,
    passwordRecovery,
    canGoBack,
    back,
  }

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let active = true
    let listener: PluginListenerHandle | null = null
    void App.addListener('backButton', (event) => {
      const state = nativeBackState.current
      if (state.mobileOpen) {
        setMobileOpen(false)
      } else if (state.searchOpen) {
        setSearchOpen(false)
      } else if (state.signOutConfirmationOpen) {
        setSignOutConfirmationOpen(false)
      } else if (state.authViewOpen) {
        setAuthViewOpen(false)
      } else if (state.passwordRecovery) {
        setPasswordRecovery(false)
      } else if (state.canGoBack) {
        state.back()
      } else if (event.canGoBack) {
        window.history.back()
      } else {
        void App.exitApp().catch((error: unknown) => {
          notify(
            error instanceof Error
              ? `Não foi possível fechar o app: ${error.message}`
              : 'Não foi possível fechar o app.',
          )
        })
      }
    })
      .then((handle) => {
        if (active) {
          listener = handle
        } else {
          void handle.remove().catch((error: unknown) => {
            console.error('Não foi possível remover o listener do botão Voltar:', error)
          })
        }
      })
      .catch((error: unknown) => {
        notify(
          error instanceof Error
            ? `Não foi possível ativar o botão Voltar do Android: ${error.message}`
            : 'Não foi possível ativar o botão Voltar do Android.',
        )
      })

    return () => {
      active = false
      if (listener) {
        void listener.remove().catch((error: unknown) => {
          console.error('Não foi possível remover o listener do botão Voltar:', error)
        })
      }
    }
  }, [notify])

  useEffect(() => {
    configureAuthGuard(session?.user.id ?? null, requestLogin)
  }, [configureAuthGuard, requestLogin, session])

  useEffect(() => {
    if (!session && view.name === 'profile') navigate({ name: 'home' })
  }, [navigate, session, view.name])

  useEffect(() => {
    let active = true
    const userId = session?.user.id
    if (!userId) {
      setProfileDisplayName('')
      setProfileNameUserId(null)
      setProfileNameError(null)
      setStatusSetup(null)
      setStatusSetupError(null)
      return
    }

    setProfileDisplayName('')
    setProfileNameUserId(userId)
    setProfileNameError(null)
    setStatusSetup({ userId, complete: null })
    setStatusSetupError(null)

    const loadDisplayName = async () => {
      try {
        const { data, error } = await getSupabaseClient()
          .from('profiles')
          .select('display_name, study_status_setup_completed')
          .eq('id', userId)
          .single()
        if (error) throw error
        if (active) {
          setProfileDisplayName(data.display_name.trim())
          setStatusSetup({ userId, complete: data.study_status_setup_completed })
        }
      } catch (error) {
        if (active) {
          setStatusSetupError(
            error instanceof Error
              ? `Não foi possível carregar sua configuração de estudo: ${error.message}`
              : 'Não foi possível carregar sua configuração de estudo.',
          )
          setProfileNameError(
            error instanceof Error
              ? `Não foi possível carregar o nome do perfil: ${error.message}`
              : 'Não foi possível carregar o nome do perfil.',
          )
        }
      }
    }

    void loadDisplayName()
    return () => {
      active = false
    }
  }, [session?.user.id, profileRetry])

  useEffect(() => {
    let active = true
    let unsubscribe = () => {}

    try {
      const supabase = getSupabaseClient()
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, nextSession) => {
        initializedByAuthEvent.current = true
        configureAuthGuard(nextSession?.user.id ?? null, requestLogin)
        setSession(nextSession)
        setAuthState('ready')
        setAuthError(null)
        if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
        if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') setPasswordRecovery(false)
        if (event === 'SIGNED_IN') setAuthViewOpen(false)
        if (event === 'PASSWORD_RECOVERY') setAuthViewOpen(false)
      })
      unsubscribe = () => subscription.unsubscribe()

      supabase.auth.getSession().then(({ data, error }) => {
        if (!active || initializedByAuthEvent.current) return
        if (error) {
          setAuthError(error.message)
          setAuthState('ready')
          return
        }
        configureAuthGuard(data.session?.user.id ?? null, requestLogin)
        setSession(data.session)
        setAuthState('ready')
      }).catch((error: unknown) => {
        if (!active || initializedByAuthEvent.current) return
        configureAuthGuard(null, requestLogin)
        setAuthError(error instanceof Error ? error.message : 'Não foi possível verificar sua sessão.')
        setAuthState('ready')
      })
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Não foi possível inicializar o Supabase.')
      setAuthState('ready')
    }

    return () => {
      active = false
      unsubscribe()
    }
  }, [configureAuthGuard, requestLogin])

  const signOut = async () => {
    setSigningOut(true)
    try {
      const { error } = await getSupabaseClient().auth.signOut({ scope: 'local' })
      if (error) throw error
      setSignOutConfirmationOpen(false)
    } catch (error) {
      notify(error instanceof Error ? `Não foi possível sair: ${error.message}` : 'Não foi possível sair.')
    } finally {
      setSigningOut(false)
    }
  }

  const completeStatusSetup = async () => {
    if (!session) return false
    try {
      const { error } = await getSupabaseClient()
        .from('profiles')
        .update({ study_status_setup_completed: true })
        .eq('id', session.user.id)
      if (error) throw error
      setStatusSetup({ userId: session.user.id, complete: true })
      setStatusSetupError(null)
      return true
    } catch (error) {
      notify(
        error instanceof Error
          ? `Não foi possível concluir a configuração: ${error.message}`
          : 'Não foi possível concluir a configuração.',
      )
      return false
    }
  }

  const handleAccountDeleted = async (userId: string) => {
    const cleanup = await clearAccountData(userId)
    let signOutError: string | null = null
    try {
      const { error } = await getSupabaseClient().auth.signOut({ scope: 'local' })
      if (error) signOutError = error.message
    } catch (error) {
      signOutError = error instanceof Error ? error.message : 'Erro inesperado ao encerrar a sessão.'
    }

    configureAuthGuard(null, requestLogin)
    setSession(null)
    setAuthViewOpen(false)
    navigate({ name: 'home' })

    if (signOutError) {
      notify(`Conta excluída, mas não foi possível limpar completamente a sessão: ${signOutError}`)
    } else if (cleanup.cacheClearFailed || cleanup.failedPdfDeletes > 0) {
      notify('Conta excluída. Alguns dados locais não puderam ser removidos deste navegador.')
    } else {
      notify('Conta e dados associados excluídos. Você já pode criar uma conta novamente.')
    }
  }

  if (authState === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Verificando sua sessão…
      </main>
    )
  }

  if (passwordRecovery) {
    return (
      <AuthView
        recovery
        onRecoveryComplete={() => setPasswordRecovery(false)}
      />
    )
  }

  if (session && syncState === 'error') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p role="alert" className="max-w-lg text-sm text-destructive">
          {accountError ?? 'Não foi possível carregar os dados da sua conta.'}
        </p>
        <button
          type="button"
          onClick={retryAccountData}
          className="rounded-full border px-4 py-2 text-sm hover:bg-secondary"
        >
          Tentar novamente
        </button>
      </main>
    )
  }

  if (session && statusSetupError) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p role="alert" className="max-w-lg text-sm text-destructive">{statusSetupError}</p>
        <button
          type="button"
          onClick={() => setProfileRetry((attempt) => attempt + 1)}
          className="rounded-full border px-4 py-2 text-sm hover:bg-secondary"
        >
          Tentar novamente
        </button>
      </main>
    )
  }

  if (
    session &&
    (syncState === 'loading' ||
      statusSetup?.userId !== session.user.id ||
      statusSetup.complete === null)
  ) {
    return (
      <main className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Carregando sua conta…
      </main>
    )
  }

  if (session && statusSetup && !statusSetup.complete) {
    return <StatusSetupView mode="onboarding" onComplete={completeStatusSetup} />
  }

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <AppSidebar showProfile={Boolean(session)} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          />
          <div className="relative h-full w-[min(18rem,calc(100vw-2rem))] animate-in border-r border-sidebar-border bg-sidebar slide-in-from-left">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-5 right-4 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
            >
              <X className="size-4" />
              <span className="sr-only">Fechar menu</span>
            </button>
            <AppSidebar showProfile={Boolean(session)} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 px-3 sm:h-20 sm:gap-3 sm:px-6 lg:px-10">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground max-sm:size-11 lg:hidden"
            >
              <Menu className="size-4" />
              <span className="sr-only">Abrir menu</span>
            </button>
            <div className="hidden flex-1 lg:block" />
            <div className="min-w-0 flex-1">
              <SearchBar
                clearToken={searchClearToken}
                open={searchOpen}
                onOpenChange={setSearchOpen}
              />
            </div>
            <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
              {session ? (
                <>
                  <span className="hidden max-w-40 truncate text-xs text-muted-foreground xl:block">
                    {profileNameUserId === session.user.id
                      ? profileDisplayName || 'Minha conta'
                      : 'Minha conta'}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate({ name: 'profile' })}
                    aria-label="Abrir perfil"
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs hover:bg-secondary max-sm:size-10 max-sm:justify-center max-sm:px-0"
                  >
                    <UserRound className="size-3.5" />
                    <span className="max-sm:hidden">Perfil</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignOutConfirmationOpen(true)}
                    disabled={signingOut}
                    className="inline-flex size-8 items-center justify-center rounded-full border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 max-sm:size-10"
                    aria-label="Sair da conta"
                    title="Sair da conta"
                  >
                    {signingOut ? <LoaderCircle className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={requestLogin}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs hover:bg-secondary max-sm:h-10"
                >
                  <UserRound className="size-3.5" />
                  Entrar
                </button>
              )}
            </div>
          </div>
        </header>

        {accountError ? (
          <div role="alert" className="flex flex-wrap items-center justify-center gap-3 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-center text-xs text-destructive sm:px-6 lg:px-10">
            <span>{accountError}</span>
            <button type="button" onClick={retryAccountData} className="font-medium underline underline-offset-2">
              Tentar novamente
            </button>
          </div>
        ) : authError && !session ? (
          <div role="status" className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-center text-xs text-destructive sm:px-6 lg:px-10">
            Não foi possível verificar a sessão. O app continua disponível, mas o login pode falhar: {authError}
          </div>
        ) : session && syncState === 'loading' ? (
          <div role="status" className="border-b px-4 py-2 text-center text-xs text-muted-foreground sm:px-6 lg:px-10">
            Carregando os dados da sua conta…
          </div>
        ) : session && syncState === 'syncing' ? (
          <div role="status" className="border-b px-4 py-2 text-center text-xs text-muted-foreground sm:px-6 lg:px-10">
            Salvando alterações na sua conta…
          </div>
        ) : profileNameError && session ? (
          <div role="status" className="border-b px-4 py-2 text-center text-xs text-muted-foreground sm:px-6 lg:px-10">
            {profileNameError}
          </div>
        ) : null}

        <main className="px-3 py-5 sm:px-6 sm:py-8 lg:px-10">
          <CurrentView
            user={session?.user ?? null}
            onDisplayNameChange={(name) => {
              setProfileDisplayName(name)
              setProfileNameError(null)
            }}
            onAccountDeleted={handleAccountDeleted}
            onScoreAdded={clearSearchAfterScoreAdded}
          />
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-xs text-muted-foreground sm:px-6 sm:py-6 lg:px-10">
          <p>Cadenza · Sua biblioteca de partituras de piano</p>
        </footer>
      </div>

      <ToastViewport />
      {signOutConfirmationOpen && session && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sign-out-title"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
        >
          <section className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-2xl">
            <h2 id="sign-out-title" className="text-lg font-medium">
              Tem certeza que quer sair?
            </h2>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSignOutConfirmationOpen(false)}
                disabled={signingOut}
                className="inline-flex h-9 items-center justify-center rounded-full border px-4 text-sm hover:bg-secondary disabled:opacity-50"
              >
                Não
              </button>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/85 disabled:opacity-50"
              >
                {signingOut ? 'Saindo…' : 'Sim'}
              </button>
            </div>
          </section>
        </div>
      )}
      {authViewOpen && !session && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Entrar para salvar seus estudos"
          className="fixed inset-0 z-[60] max-h-dvh overflow-y-auto bg-background"
        >
          <button
            type="button"
            onClick={() => setAuthViewOpen(false)}
            className="fixed top-4 right-4 z-20 flex size-10 items-center justify-center rounded-full border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Fechar login"
          >
            <X className="size-4" />
          </button>
          <div className="relative z-0">
            <AuthView
              loginPrompt
              onRecoveryComplete={() => {
                setPasswordRecovery(false)
                setAuthViewOpen(false)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function CurrentView({
  user,
  onDisplayNameChange,
  onAccountDeleted,
  onScoreAdded,
}: {
  user: Session['user'] | null
  onDisplayNameChange: (displayName: string) => void
  onAccountDeleted: (userId: string) => Promise<void>
  onScoreAdded: () => void
}) {
  const { view } = useStore()
  const key = JSON.stringify(view)
  return (
    <div key={key} className="mx-auto max-w-[1400px] animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      {view.name === 'home' && <HomeView />}
      {view.name === 'board' && <BoardView />}
      {view.name === 'all' && <LibraryView />}
      {view.name === 'folder' && <LibraryView folderId={view.id} />}
      {view.name === 'detail' && <DetailView id={view.id} external={view.external} />}
      {view.name === 'compare' && <CompareView id={view.id} />}
      {view.name === 'study' && <StudyView id={view.id} />}
      {view.name === 'musescore' && <MuseScoreView score={view.score} onAdded={onScoreAdded} />}
      {view.name === 'musescore-selection' && (
        <MuseScoreSelectionView scores={view.scores} onAdded={onScoreAdded} />
      )}
      {view.name === 'pdf-upload' && <PdfUploadView />}
      {view.name === 'profile' && user && (
        <ProfileView
          user={user}
          onDisplayNameChange={onDisplayNameChange}
          onAccountDeleted={onAccountDeleted}
        />
      )}
    </div>
  )
}

function ToastViewport() {
  const { toast } = useStore()
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      {toast && (
        <div
          key={toast.id}
          className="flex animate-in items-center gap-2.5 rounded-xl border bg-popover px-4 py-3 text-sm shadow-2xl shadow-black/60 fade-in-0 slide-in-from-bottom-2"
        >
          <CircleCheck className="size-4 text-mastered" />
          {toast.message}
        </div>
      )}
    </div>
  )
}
