import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, ChevronDown, Dumbbell, LineChart, Plus, Star, Trash2 } from 'lucide-react'
import { usePeopleContext } from '@/hooks/PeopleContext'
import { useWorkoutsContext } from '@/hooks/WorkoutsContext'
import { useCompletedWorkoutsContext } from '@/hooks/CompletedWorkoutsContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/Avatar'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatDate } from '@/utils/date'
import { lastWorkoutOf, workoutsOf } from '@/utils/workouts'
import { cn } from '@/lib/utils'
import { summarizeSets } from '@/utils/sets'
import type { Workout } from '@/types'

export function PersonPage() {
  const { personId = '' } = useParams()
  const navigate = useNavigate()
  const { people, favoriteId, deletePerson, toggleFavorite } = usePeopleContext()
  const { workouts, deleteWorkoutsByPerson } = useWorkoutsContext()
  const { deleteCompletedByPerson } = useCompletedWorkoutsContext()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const person = people.find((p) => p.id === personId)

  if (!person) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader onBack={() => navigate('/')} />
        <p className="mt-6 text-muted-foreground">Человек не найден.</p>
      </div>
    )
  }

  // Тренировки конкретного человека — фильтр по personId.
  const own = workoutsOf(workouts, person.id)
  const last = lastWorkoutOf(workouts, person.id)
  const isFavorite = favoriteId === person.id

  function onDeletePerson() {
    deleteWorkoutsByPerson(person!.id)
    deleteCompletedByPerson(person!.id)
    deletePerson(person!.id)
    navigate('/', { replace: true })
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <PageHeader onBack={() => navigate('/')} />

      <header className="flex flex-col items-center gap-3 text-center animate-in fade-in slide-in-from-bottom-2">
        <Avatar
          name={person.name}
          avatar={person.avatar}
          size={96}
          className={cn(isFavorite && 'ring-2 ring-primary ring-offset-4 ring-offset-background')}
        />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{person.name}</h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {own.length === 0
              ? 'Пока нет тренировок'
              : `${own.length} трен.${last ? ` · последняя ${formatDate(last.date)}` : ''}`}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className={cn('rounded-full px-4', isFavorite && 'bg-primary/15 text-primary hover:bg-primary/20')}
          onClick={() => toggleFavorite(person.id)}
          aria-pressed={isFavorite}
        >
          <Star className={cn('!size-4', isFavorite && 'fill-current')} />
          {isFavorite ? 'Основной' : 'Сделать основным'}
        </Button>
      </header>

      <Button size="lg" className="w-full" onClick={() => navigate(`/person/${person.id}/progress`)}>
        <LineChart /> Прогресс
      </Button>

      {/* Шаблоны тренировок — внутри открываешь и отмечаешь выполнение */}
      <section className="flex flex-col gap-3">
        <h2 className="mt-2 px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Шаблоны тренировок
        </h2>

        {own.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 px-6 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <Dumbbell className="size-6" />
            </span>
            <p className="font-bold">Создайте первый шаблон тренировки</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
            {own.map((w, i) => (
              <div
                key={w.id}
                className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <TemplateCard
                  workout={w}
                  onOpen={() => navigate(`/person/${person.id}/workout/${w.id}`)}
                />
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          size="lg"
          className="w-full border-dashed text-muted-foreground hover:text-foreground"
          onClick={() => navigate(`/person/${person.id}/new`)}
        >
          <Plus /> Новый шаблон
        </Button>
      </section>

      <Button
        variant="ghost"
        size="lg"
        className="text-destructive hover:bg-destructive/10"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 /> Удалить человека
      </Button>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Удалить «${person.name}»?`}
        description="Все шаблоны и выполненные тренировки этого человека будут удалены без возможности восстановления."
        onConfirm={onDeletePerson}
      />
    </div>
  )
}

// Сворачиваемая карточка шаблона: свёрнуто — только название, развёрнуто —
// все упражнения с подходами. «Открыть» ведёт в полный редактор.
function TemplateCard({ workout, onOpen }: { workout: Workout; onOpen: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <Card className="overflow-hidden">
      <button
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Dumbbell className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-bold">{workout.name}</span>
          <span className="block text-xs font-medium text-muted-foreground">
            {workout.exercises.length} упр.
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-5 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border/60 px-4 pb-4 pt-3 animate-in fade-in">
          {workout.exercises.length === 0 ? (
            <p className="pb-3 text-sm text-muted-foreground">Упражнений пока нет</p>
          ) : (
            <ul className="mb-3 flex flex-col divide-y divide-border/50">
              {workout.exercises.map((ex) => {
                const { lines, moreSets } = summarizeSets(ex.sets)
                return (
                  <li key={ex.id} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-sm font-semibold">
                      {ex.name || 'Без названия'}
                    </span>
                    <span className="flex shrink-0 flex-col items-end text-xs font-medium tabular-nums text-muted-foreground">
                      {lines.length === 0 ? '—' : lines.map((l, i) => <span key={i}>{l}</span>)}
                      {moreSets > 0 && <span className="opacity-70">ещё {moreSets} подх.</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}

          <Button variant="secondary" className="w-full" onClick={onOpen}>
            Открыть <ArrowRight />
          </Button>
        </div>
      )}
    </Card>
  )
}
