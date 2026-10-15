import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, CircleCheck, Copy, Hand, Settings, Trash2 } from 'lucide-react'
import { useWorkoutsContext } from '@/hooks/WorkoutsContext'
import { usePeopleContext } from '@/hooks/PeopleContext'
import { useCompletedWorkoutsContext } from '@/hooks/CompletedWorkoutsContext'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { WorkoutHeading } from '@/components/WorkoutHeading'
import { WorkoutStats } from '@/components/WorkoutStats'
import { ExerciseList } from '@/components/ExerciseList'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CopyWorkoutSheet } from '@/components/CopyWorkoutSheet'
import { MarkWorkoutSheet } from '@/components/MarkWorkoutSheet'
import { ExerciseCatalogSheet } from '@/components/ExerciseCatalogSheet'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/utils/date'
import { takeFlash } from '@/utils/flash'

export function WorkoutPage() {
  const { id = '', personId = '' } = useParams()
  const navigate = useNavigate()
  const backToPerson = `/person/${personId}`
  const [copyOpen, setCopyOpen] = useState(false)
  const [markOpen, setMarkOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  // «Сохранено в прогресс» после экрана таймера — показываем несколько секунд.
  const [flash, setFlashState] = useState(takeFlash)
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlashState(null), 5000)
    return () => clearTimeout(t)
  }, [flash])
  const { people } = usePeopleContext()
  const { completed, completeTemplate } = useCompletedWorkoutsContext()
  const workoutsApi = useWorkoutsContext()
  const { workouts, updateWorkout, copyWorkout, deleteWorkout } = workoutsApi

  // Дни с уже отмеченными тренировками — для точек в календаре.
  const markedKeys = useMemo(
    () =>
      new Set(
        completed.filter((c) => c.personId === personId).map((c) => c.date),
      ),
    [completed, personId],
  )

  const workout = workouts.find((w) => w.id === id)

  if (!workout) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader onBack={() => navigate(backToPerson)} />
        <p className="mt-6 text-muted-foreground">Тренировка не найдена.</p>
      </div>
    )
  }

  function onDeleteWorkout() {
    deleteWorkout(workout!.id)
    navigate(backToPerson, { replace: true })
  }

  function onCopyTo(targetPersonId: string) {
    const copy = copyWorkout(workout!.id, targetPersonId)
    setCopyOpen(false)
    if (copy) navigate(`/person/${targetPersonId}/workout/${copy.id}`)
  }

  function onMarkDone(dayKeyValue: string, exerciseIds: string[]) {
    const record = completeTemplate(workout!, dayKeyValue, exerciseIds)
    setMarkOpen(false)
    // Дальше — запись факта: что реально сделано в каждом подходе.
    navigate(`/person/${personId}/completed/${record.id}`, { state: { logging: true } })
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <PageHeader
        onBack={() => navigate(backToPerson)}
        right={
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 [&_svg]:size-[22px]"
            onClick={() => setCatalogOpen(true)}
            aria-label="Справочник упражнений"
          >
            <Settings />
          </Button>
        }
      />

      <WorkoutHeading
        value={workout.name}
        onChange={(name) => updateWorkout(workout.id, { name })}
        subtitle={
          <>
            <CalendarDays /> {formatDate(workout.date)}
          </>
        }
      />

      {flash && (
        <Card className="flex items-center gap-3 border-primary/30 bg-primary/10 p-4 animate-in fade-in slide-in-from-top-2">
          <CircleCheck className="size-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 text-sm font-semibold">{flash.text}</span>
          {flash.link && (
            <Link to={flash.link.to} className="shrink-0 text-sm font-bold text-primary">
              {flash.link.label}
            </Link>
          )}
        </Card>
      )}

      <WorkoutStats exercises={workout.exercises} />

      <Button size="lg" className="w-full" onClick={() => setMarkOpen(true)}>
        <CircleCheck /> Отметить выполнение
      </Button>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Упражнения
          </h2>
          {workout.exercises.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
              <Hand className="size-3" /> Свайп вправо — таймер отдыха
            </span>
          )}
        </div>
        <ExerciseList
          ownerId={workout.id}
          exercises={workout.exercises}
          ops={workoutsApi}
          mode="plan"
          onRun={(exerciseId) => navigate(`/person/${personId}/workout/${workout.id}/run/${exerciseId}`)}
        />
      </section>

      <div className="grid gap-2 pt-2 sm:grid-cols-2">
        <Button variant="secondary" size="lg" onClick={() => setCopyOpen(true)}>
          <Copy /> Копировать другому
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 /> Удалить тренировку
        </Button>
      </div>

      <CopyWorkoutSheet
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        people={people}
        currentPersonId={personId}
        onPick={onCopyTo}
      />

      <MarkWorkoutSheet
        open={markOpen}
        onClose={() => setMarkOpen(false)}
        template={workout}
        markedKeys={markedKeys}
        onSave={onMarkDone}
      />

      <ExerciseCatalogSheet open={catalogOpen} onClose={() => setCatalogOpen(false)} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Удалить тренировку целиком?"
        description="Шаблон и его упражнения будут удалены. Отмеченные выполнения останутся в истории."
        onConfirm={onDeleteWorkout}
      />
    </div>
  )
}
