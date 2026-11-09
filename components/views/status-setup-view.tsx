'use client'

import { Check, Palette, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { STATUS_COLORS, type StatusColor, type StudyStatus } from '@/lib/data'
import { useStore } from '@/lib/store'
import { Button } from '../ui/button'

const COLOR_OPTIONS: { id: StatusColor; label: string }[] = [
  { id: 'mint', label: 'Verde' },
  { id: 'amber', label: 'Amarelo' },
  { id: 'blue', label: 'Azul' },
  { id: 'rose', label: 'Vermelho' },
  { id: 'violet', label: 'Violeta' },
  { id: 'cyan', label: 'Ciano' },
  { id: 'pink', label: 'Rosa' },
  { id: 'orange', label: 'Laranja' },
  { id: 'slate', label: 'Cinza' },
]

type StatusSetupViewProps =
  | { mode: 'onboarding'; onComplete: () => Promise<boolean> }
  | { mode: 'editor'; onClose: () => void }

export function StatusSetupView(props: StatusSetupViewProps) {
  const { mode } = props
  const { statuses, library, saveStatuses } = useStore()
  const [draft, setDraft] = useState(statuses)
  const [openPalette, setOpenPalette] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const updateDraft = (id: string, update: Partial<StudyStatus>) => {
    setDraft((items) => items.map((item) => (item.id === id ? { ...item, ...update } : item)))
  }

  const addStatus = () => {
    const id = `custom-${crypto.randomUUID()}`
    setDraft((items) => {
      let suffix = items.length + 1
      let name = 'Novo status'
      while (items.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
        suffix += 1
        name = `Novo status ${suffix}`
      }
      return [...items, { id, name, color: 'violet' }]
    })
  }

  const removeStatus = (id: string) => {
    if (draft.length <= 1 || library.some((score) => score.status === id)) return
    setDraft((items) => items.filter((item) => item.id !== id))
    setOpenPalette(null)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (!(await saveStatuses(draft))) return
      if (mode === 'onboarding') {
        await props.onComplete()
      } else {
        props.onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  const editor = (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 id={mode === 'editor' ? 'status-editor-title' : undefined} className="text-xl font-medium tracking-tight">
            Personalize seu estudo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie os estados que melhor descrevem seu progresso nas partituras.
          </p>
        </div>
        {mode === 'editor' && (
          <button
            type="button"
            onClick={() => mode === 'editor' && props.onClose()}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Fechar personalização"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {draft.map((status) => {
          const count = library.filter((score) => score.status === status.id).length
          const canDelete = draft.length > 1 && count === 0
          return (
            <article key={status.id} className="relative flex items-center gap-3 rounded-2xl border bg-background p-3">
              <div className="relative">
                <button
                  type="button"
                  aria-label={`Escolher cor de ${status.name}`}
                  aria-expanded={openPalette === status.id}
                  onClick={() => setOpenPalette((current) => current === status.id ? null : status.id)}
                  className="flex size-9 items-center justify-center rounded-full border bg-secondary/60"
                >
                  <span
                    className="size-4 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: STATUS_COLORS[status.color] }}
                  />
                </button>
                {openPalette === status.id && (
                  <div
                    role="radiogroup"
                    aria-label={`Paleta de cores para ${status.name}`}
                    className="absolute top-11 left-0 z-10 grid w-36 grid-cols-3 gap-2 rounded-xl border bg-popover p-3 shadow-xl"
                  >
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        role="radio"
                        aria-checked={status.color === color.id}
                        aria-label={color.label}
                        title={color.label}
                        onClick={() => {
                          updateDraft(status.id, { color: color.id })
                          setOpenPalette(null)
                        }}
                        className="flex size-8 items-center justify-center rounded-full border border-transparent hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span
                          className="size-4 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[color.id] }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <label className="min-w-0 flex-1">
                <span className="sr-only">Nome do status</span>
                <input
                  value={status.name}
                  onChange={(event) => updateDraft(status.id, { name: event.target.value })}
                  maxLength={40}
                  className="h-9 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  aria-label={`Nome do status ${status.name}`}
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  {count} {count === 1 ? 'partitura' : 'partituras'}
                </span>
              </label>
              <button
                type="button"
                onClick={() => removeStatus(status.id)}
                disabled={!canDelete}
                title={
                  count > 0
                    ? 'Mova as partituras para outro status antes de excluir'
                    : draft.length <= 1
                      ? 'Mantenha pelo menos um status'
                      : 'Excluir status'
                }
                aria-label={`Excluir status ${status.name}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Trash2 className="size-4" />
              </button>
            </article>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={addStatus}>
          <Plus /> Adicionar status
        </Button>
        <div className="flex items-center gap-2">
          {mode === 'editor' && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => mode === 'editor' && props.onClose()}
              disabled={saving}
            >
              Cancelar
            </Button>
          )}
          <Button type="button" onClick={save} disabled={saving}>
            {mode === 'onboarding' ? <Check /> : <Palette />}
            {saving ? 'Salvando…' : mode === 'onboarding' ? 'Salvar e continuar' : 'Salvar alterações'}
          </Button>
        </div>
      </div>
    </div>
  )

  if (mode === 'editor') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-editor-title"
        className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:items-center sm:p-4"
      >
        <section className="my-auto w-full max-w-2xl rounded-3xl border bg-card p-4 shadow-2xl sm:p-7">
          {editor}
        </section>
      </div>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-3xl rounded-3xl border bg-card p-5 shadow-2xl sm:p-8">
        <p className="mb-2 text-xs font-medium tracking-wide text-primary uppercase">Seu espaço de estudo</p>
        {editor}
      </section>
    </main>
  )
}
