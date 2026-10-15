import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { History, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from './ConfirmDialog'
import { useExerciseCatalogContext } from '@/hooks/ExerciseCatalogContext'
import { useWorkoutsContext } from '@/hooks/WorkoutsContext'
import { useCompletedWorkoutsContext } from '@/hooks/CompletedWorkoutsContext'
import { EXERCISE_CATEGORIES } from '@/constants/exercises'
import { exerciseNameKey, findCatalogEntry, groupCatalog } from '@/utils/exercises'
import { cn } from '@/lib/utils'
import type { CatalogExercise, Exercise, ExerciseCategory } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

const CATEGORY_IDS = EXERCISE_CATEGORIES.map((c) => c.id) as [
  ExerciseCategory,
  ...ExerciseCategory[],
]

const EMPTY_FORM = { name: '', category: 'other' as ExerciseCategory }

// Управление справочником: просмотр, поиск, добавление/редактирование/удаление
// собственных упражнений. Стандартные — только для просмотра.
export function ExerciseCatalogSheet({ open, onClose }: Props) {
  const { catalog, validate, addCustom, updateCustom, removeCustom } =
    useExerciseCatalogContext()
  const { workouts, mapAllExercises: mapWorkoutExercises } = useWorkoutsContext()
  const { completed, mapAllExercises: mapCompletedExercises } =
    useCompletedWorkoutsContext()

  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<CatalogExercise | null>(null)

  // Схема зависит от справочника: проверка дубликата — та же, что в хуке.
  const schema = useMemo(
    () =>
      z
        .object({ name: z.string(), category: z.enum(CATEGORY_IDS) })
        .superRefine((v, ctx) => {
          const error = validate(v.name, editingId ?? undefined)
          if (error) ctx.addIssue({ code: 'custom', path: ['name'], message: error })
        }),
    [validate, editingId],
  )
  type FormValues = z.infer<typeof schema>

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  })

  function resetForm() {
    setEditingId(null)
    form.reset(EMPTY_FORM)
  }

  useEffect(() => {
    if (open) {
      setQuery('')
      resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const groups = useMemo(() => groupCatalog(catalog, query), [catalog, query])
  const customCount = catalog.filter((c) => c.custom).length

  // Названия из старых тренировок, которых нет в справочнике (уникальные).
  const legacyNames = useMemo(() => {
    const q = exerciseNameKey(query)
    const seen = new Map<string, string>()
    for (const w of [...workouts, ...completed]) {
      for (const ex of w.exercises) {
        const key = exerciseNameKey(ex.name)
        if (!key || seen.has(key) || findCatalogEntry(catalog, ex)) continue
        seen.set(key, ex.name.trim())
      }
    }
    return [...seen.entries()]
      .filter(([key]) => key.includes(q))
      .map(([, value]) => value)
  }, [workouts, completed, catalog, query])

  function mapAll(fn: (e: Exercise) => Exercise) {
    mapWorkoutExercises(fn)
    mapCompletedExercises(fn)
  }

  function onSubmit({ name, category }: FormValues) {
    if (editingId) {
      const res = updateCustom(editingId, name, category)
      if (!res.ok) return form.setError('name', { message: res.error })
      // Переименование доходит до всех тренировок, где упражнение выбрано.
      const { id, name: newName } = res.exercise
      mapAll((ex) => (ex.catalogId === id ? { ...ex, name: newName } : ex))
    } else {
      const res = addCustom(name, category)
      if (!res.ok) return form.setError('name', { message: res.error })
      // Привязываем старые записи с тем же названием (без учёта регистра и
      // пробелов), чтобы будущие переименования их тоже обновляли.
      const { id, name: newName } = res.exercise
      const key = exerciseNameKey(newName)
      const ids = new Set(catalog.map((c) => c.id))
      mapAll((ex) =>
        exerciseNameKey(ex.name) === key && !(ex.catalogId && ids.has(ex.catalogId))
          ? { ...ex, catalogId: id, name: newName }
          : ex,
      )
    }
    resetForm()
  }

  function startEdit(ex: CatalogExercise) {
    setEditingId(ex.id)
    form.reset({ name: ex.name, category: ex.category })
    form.setFocus('name')
  }

  function prefillLegacy(legacyName: string) {
    setEditingId(null)
    form.reset({ name: legacyName, category: 'other' })
    form.setFocus('name')
  }

  function confirmDelete() {
    if (!deleting) return
    removeCustom(deleting.id)
    if (editingId === deleting.id) resetForm()
    setDeleting(null)
  }

  const nameValue = form.watch('name')

  return (
    <>
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="h-[92dvh]">
          <DrawerHeader>
            <DrawerTitle>Справочник</DrawerTitle>
            <DrawerDescription>
              {catalog.length - customCount} стандартных · {customCount} своих
            </DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid gap-3 rounded-2xl border border-border bg-background/40 p-4"
              >
                <div className="text-sm font-bold">
                  {editingId ? 'Редактировать упражнение' : 'Новое упражнение'}
                </div>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Например, жим Свенда"
                          enterKeyHint="done"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Мышечная группа</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXERCISE_CATEGORIES.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-1">
                  {editingId && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={resetForm}
                    >
                      Отмена
                    </Button>
                  )}
                  <Button type="submit" className="flex-1" disabled={!nameValue.trim()}>
                    {editingId ? (
                      'Сохранить'
                    ) : (
                      <>
                        <Plus /> Добавить
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            <div className="sticky top-0 z-20 -mx-5 mt-5 bg-card px-5 py-1">
              <div className="flex items-center gap-2 rounded-xl bg-input px-4">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск упражнения"
                  enterKeyHint="search"
                  className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {legacyNames.length > 0 && (
              <Section title="Из прошлых тренировок" icon={<History className="size-3.5" />}>
                {legacyNames.map((n) => (
                  <Row key={n} name={n}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-primary"
                      onClick={() => prefillLegacy(n)}
                    >
                      В справочник
                    </Button>
                  </Row>
                ))}
              </Section>
            )}

            {groups.length === 0 && legacyNames.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Ничего не найдено.
              </p>
            )}

            {groups.map((g) => (
              <Section key={g.label} title={g.label}>
                {g.items.map((ex) =>
                  ex.custom ? (
                    <Row key={ex.id} name={ex.name} highlighted={ex.id === editingId}>
                      <Badge>своё</Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9"
                        onClick={() => startEdit(ex)}
                        aria-label="Редактировать упражнение"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9 text-destructive"
                        onClick={() => setDeleting(ex)}
                        aria-label="Удалить упражнение"
                      >
                        <Trash2 />
                      </Button>
                    </Row>
                  ) : (
                    <Row key={ex.id} name={ex.name} muted />
                  ),
                )}
              </Section>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Удалить «${deleting?.name}»?`}
        description="Упражнение исчезнет из справочника. История тренировок, где оно использовалось, сохранится."
        onConfirm={confirmDelete}
      />
    </>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mt-4">
      <h3 className="flex items-center gap-1.5 px-1 pb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {icon}
        {title}
      </h3>
      <div className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-background/40">
        {children}
      </div>
    </section>
  )
}

function Row({
  name,
  muted,
  highlighted,
  children,
}: {
  name: string
  muted?: boolean
  highlighted?: boolean
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex min-h-12 items-center gap-2 px-4 py-1.5 transition-colors',
        highlighted && 'bg-primary/10',
      )}
    >
      <span
        className={cn(
          'flex-1 py-1.5 text-[15px]',
          muted ? 'text-muted-foreground' : 'font-semibold text-foreground',
        )}
      >
        {name}
      </span>
      {children}
    </div>
  )
}
