import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CalendarCheck, Flag, Info, Settings, Trash2 } from 'lucide-react'
import { useCompletedWorkoutsContext } from '@/hooks/CompletedWorkoutsContext'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { WorkoutHeading } from '@/components/WorkoutHeading'
import { WorkoutStats } from '@/components/WorkoutStats'
import { ExerciseList } from '@/components/ExerciseList'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ExerciseCatalogSheet } from '@/components/ExerciseCatalogSheet'
import { Card } from '@/components/ui/card'
import { formatDayKeyFull } from '@/utils/date'
import { fireConfetti } from '@/utils/confetti'

export function CompletedWorkoutPage() {
  const { logId = '', personId = '' } = useParams()
  const navigate = useNavigate()
  // Пришли сюда сразу после «Отметить выполнение» — режим записи факта.
  const logging = (useLocation().state as { logging?: boolean } | null)?.logging === true
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const completedApi = useCompletedWorkoutsContext()
  const { completed, renameCompleted, deleteCompleted } = completedApi

  const record = completed.find((c) => c.id === logId)

  if (!record) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader onBack={() => navigate(-1)} />
        <p className="mt-6 text-muted-foreground">Запись не найдена.</p>
      </div>
    )
  }

  function onDelete() {
    deleteCompleted(record!.id)
    navigate(`/person/${personId}/progress`, { replace: true })
  }

  const doneSets = record.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.done !== false && s.reps > 0).length,
    0,
  )

  function onFinish() {
    if (doneSets > 0) fireConfetti()
    navigate(`/person/${personId}/progress`, { replace: true })
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <PageHeader
        onBack={() => navigate(-1)}
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
        value={record.name}
        onChange={(name) => renameCompleted(record.id, name)}
        subtitle={
          <>
            <CalendarCheck className="text-primary" />
            <span className="first-letter:uppercase">{formatDayKeyFull(record.date)}</span>
          </>
        }
      />

      {logging && (
        <Card className="flex gap-3 border-primary/30 bg-primary/10 p-4 animate-in fade-in">
          <Info className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed">
            <span className="font-bold">Запишите, что сделали.</span> Отметьте ✓ выполненные
            подходы. Вес и повторения подставлены из прошлого раза (или из плана) —
            поправьте, если было иначе. В прогресс попадут только отмеченные подходы.
          </p>
        </Card>
      )}

      <WorkoutStats exercises={record.exercises} />

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Упражнения
        </h2>
        <ExerciseList
          ownerId={record.id}
          exercises={record.exercises}
          ops={completedApi}
          mode="fact"
          defaultOpen={logging}
        />
      </section>

      {logging && (
        <Button size="lg" className="w-full" onClick={onFinish}>
          <Flag /> Завершить · {doneSets} {doneSets === 1 ? 'подход' : 'подх.'} выполнено
        </Button>
      )}

      <Button
        variant="ghost"
        size="lg"
        className="text-destructive hover:bg-destructive/10"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 /> Удалить запись
      </Button>

      <ExerciseCatalogSheet open={catalogOpen} onClose={() => setCatalogOpen(false)} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Удалить эту выполненную тренировку?"
        description="Запись пропадёт из истории и статистики прогресса."
        onConfirm={onDelete}
      />
    </div>
  )
}
