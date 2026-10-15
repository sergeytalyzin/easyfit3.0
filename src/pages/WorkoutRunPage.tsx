import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Minus, Plus, SkipForward, X } from 'lucide-react'
import { useWorkoutsContext } from '@/hooks/WorkoutsContext'
import { useCompletedWorkoutsContext } from '@/hooks/CompletedWorkoutsContext'
import { useWakeLock } from '@/hooks/useWakeLock'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Stepper } from '@/components/PlanFields'
import { dayKey } from '@/utils/date'
import { formatPlan, planOf } from '@/utils/sets'
import { lastResult } from '@/utils/progress'
import { beep, unlockAudio, vibrate } from '@/utils/alarm'
import { setFlash } from '@/utils/flash'
import { loadRestSec, loadRun, saveRestSec, saveRun } from '@/utils/storage'
import { cn } from '@/lib/utils'
import type { Exercise, RunState, Workout } from '@/types'

const REST_PRESETS = [60, 90, 120, 180]

const mmss = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Экран выполнения упражнения: подход → отдых с таймером → сигнал → подход.
// Открывается свайпом вправо по упражнению в тренировке.
export function WorkoutRunPage() {
  const { personId = '', id = '', exerciseId = '' } = useParams()
  const navigate = useNavigate()
  const { workouts } = useWorkoutsContext()
  const workout = workouts.find((w) => w.id === id)
  const exercise = workout?.exercises.find((e) => e.id === exerciseId)

  useEffect(() => {
    if (!exercise) navigate(`/person/${personId}/workout/${id}`, { replace: true })
  }, [exercise, navigate, personId, id])

  if (!workout || !exercise) return null
  return <RunScreen workout={workout} exercise={exercise} personId={personId} />
}

function RunScreen({
  workout,
  exercise,
  personId,
}: {
  workout: Workout
  exercise: Exercise
  personId: string
}) {
  const navigate = useNavigate()
  const { completed, saveRunResult } = useCompletedWorkoutsContext()
  const [restSec, setRestSec] = useState(loadRestSec)
  const [state, setState] = useState<RunState>(() => initialState(workout, exercise, completed))
  const [now, setNow] = useState(Date.now())
  const [closeOpen, setCloseOpen] = useState(false)

  useWakeLock(true)

  // Состояние переживает перезагрузку и сворачивание.
  useEffect(() => {
    saveRun(state)
  }, [state])

  // Тикаем только во время отдыха; оставшееся время считаем от момента
  // окончания, поэтому после сворачивания оно сразу правильное.
  useEffect(() => {
    if (state.phase !== 'rest') return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [state.phase])

  const remaining = state.restEndsAt ? (state.restEndsAt - now) / 1000 : 0
  useEffect(() => {
    if (state.phase === 'rest' && remaining <= 0) setState((s) => ({ ...s, phase: 'alarm' }))
  }, [state.phase, remaining])

  // Сигнал: сразу и затем каждые 2 с, но не дольше 30 с.
  useEffect(() => {
    if (state.phase !== 'alarm') return
    beep()
    vibrate()
    const started = Date.now()
    const t = setInterval(() => {
      if (Date.now() - started > 30_000) return clearInterval(t)
      beep()
      vibrate()
    }, 2000)
    return () => clearInterval(t)
  }, [state.phase])

  const { sets, current, phase } = state
  const set = sets[current]
  const plan = exercise.sets[current]
  const doneCount = sets.filter((s) => s.done).length

  function updateSet(patch: Partial<RunState['sets'][number]>) {
    setState((s) => ({
      ...s,
      sets: s.sets.map((x, i) => (i === s.current ? { ...x, ...patch } : x)),
    }))
  }

  function startRest(sec: number, base: RunState) {
    return { ...base, phase: 'rest' as const, restEndsAt: Date.now() + sec * 1000, restTotal: sec }
  }

  function onSetDone() {
    unlockAudio() // звук разрешён только после нажатия
    setNow(Date.now())
    setState((s) => {
      const next = { ...s, sets: s.sets.map((x, i) => (i === s.current ? { ...x, done: true } : x)) }
      if (s.current >= s.sets.length - 1) return { ...next, phase: 'finished', restEndsAt: null }
      return startRest(restSec, { ...next, current: s.current + 1 })
    })
  }

  function onExtraSet() {
    // Ещё подход сверх плана: копия последнего, сначала отдых.
    unlockAudio()
    setNow(Date.now())
    setState((s) =>
      startRest(restSec, {
        ...s,
        sets: [...s.sets, { ...s.sets[s.sets.length - 1], done: false }],
        current: s.sets.length,
      }),
    )
  }

  function goToSet() {
    setState((s) => ({ ...s, phase: 'set', restEndsAt: null }))
  }

  function chooseRest(sec: number) {
    setRestSec(sec)
    saveRestSec(sec)
    if (phase === 'rest') {
      setNow(Date.now())
      setState((s) => startRest(sec, s))
    }
  }

  function adjustRest(delta: number) {
    setNow(Date.now())
    setState((s) => ({
      ...s,
      restEndsAt: Math.max(Date.now() + 5000, (s.restEndsAt ?? Date.now()) + delta * 1000),
      restTotal: Math.max(5, s.restTotal + delta),
    }))
  }

  function exit(save: boolean) {
    const recordId = save ? saveRunResult(workout, exercise, sets, state.day) : null
    if (recordId) {
      setFlash({
        text: `Сохранено в прогресс: ${exercise.name} · ${doneCount} подх.`,
        link: { to: `/person/${personId}/completed/${recordId}`, label: 'Открыть' },
      })
    }
    saveRun(null)
    // Назад к списку упражнений, не плодя записей в истории браузера.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(`/person/${personId}/workout/${workout.id}`, { replace: true })
  }

  const showSaveDialog = closeOpen || phase === 'finished'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-4">
        <header className="flex items-center gap-2 py-3">
          <Button variant="ghost" size="icon" className="-ml-2 shrink-0" onClick={() => setCloseOpen(true)} aria-label="Закрыть">
            <X className="!size-6" />
          </Button>
          <div className="min-w-0 flex-1 truncate text-center text-base font-bold">{exercise.name}</div>
          <div className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-bold tabular-nums">
            {Math.min(current + 1, sets.length)}/{sets.length}
          </div>
        </header>

        {/* Прогресс по подходам */}
        <div className="flex gap-1.5">
          {sets.map((s, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                s.done ? 'bg-primary' : i === current ? 'bg-foreground/40' : 'bg-secondary',
              )}
            />
          ))}
        </div>

        {phase === 'rest' ? (
          <RestView
            remaining={remaining}
            total={state.restTotal}
            nextLabel={`Подход ${current + 1} · ${set.weight.toLocaleString('ru-RU')} кг × ${set.reps}`}
            restSec={restSec}
            onChoose={chooseRest}
            onAdjust={adjustRest}
            onSkip={goToSet}
          />
        ) : (
          <div className="flex flex-1 flex-col justify-center gap-6 py-6">
            <div className="text-center">
              <div className="text-[56px] font-extrabold leading-none tracking-tight">
                Подход {Math.min(current + 1, sets.length)}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {plan ? `план: ${formatPlan(planOf(plan))}` : 'дополнительный подход'}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Вес, кг</Label>
                <Stepper
                  value={set.weight}
                  onChange={(weight) => updateSet({ weight })}
                  step={2.5}
                  decimal
                  label="Вес, кг"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Повторения</Label>
                <Stepper value={set.reps} onChange={(reps) => updateSet({ reps })} step={1} label="Повторения" />
              </div>
            </div>

            <Button size="lg" className="h-16 w-full text-lg" onClick={onSetDone}>
              <Check className="!size-6" /> Подход сделан
            </Button>

            <RestPicker restSec={restSec} onChoose={chooseRest} />
          </div>
        )}
      </div>

      {/* Отдых окончен: экран плавно пульсирует лаймом, тап — к подходу */}
      {phase === 'alarm' && (
        <button
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-primary text-primary-foreground"
          onClick={goToSet}
        >
          {/* Пульсирует только затемнение фона — текст остаётся чётким */}
          <span className="pointer-events-none absolute inset-0 animate-pulse bg-primary-foreground/20" aria-hidden="true" />
          <span className="relative text-sm font-bold uppercase tracking-[0.2em]">Отдых окончен</span>
          <span className="relative text-5xl font-extrabold tracking-tight">Поехали!</span>
          <span className="relative text-lg font-semibold">Подход {current + 1}</span>
          <span className="relative mt-6 text-sm font-medium opacity-70">Нажмите в любом месте</span>
        </button>
      )}

      <AlertDialog open={showSaveDialog} onOpenChange={(o) => !o && setCloseOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {phase === 'finished' ? 'Упражнение выполнено!' : doneCount > 0 ? 'Сохранить в прогресс?' : 'Закрыть таймер?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {doneCount > 0
                ? `Сделано подходов: ${doneCount} из ${sets.length}. Сохранить результат в прогресс?`
                : 'Ни одного подхода не сделано — сохранять нечего.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            {doneCount > 0 && <Button onClick={() => exit(true)}>Сохранить в прогресс</Button>}
            {phase === 'finished' && (
              <Button variant="secondary" onClick={onExtraSet}>
                <Plus /> Ещё подход
              </Button>
            )}
            <Button
              variant={doneCount > 0 ? 'ghost' : 'default'}
              className={doneCount > 0 ? 'text-destructive hover:bg-destructive/10' : undefined}
              onClick={() => exit(false)}
            >
              {doneCount > 0 ? 'Не сохранять' : 'Закрыть'}
            </Button>
            {phase !== 'finished' && (
              <Button variant="secondary" onClick={() => setCloseOpen(false)}>
                Продолжить
              </Button>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function RestPicker({ restSec, onChoose }: { restSec: number; onChoose: (sec: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Отдых после подхода
      </span>
      <div className="flex flex-wrap justify-center gap-2">
        {REST_PRESETS.map((sec) => (
          <Button
            key={sec}
            variant="outline"
            size="sm"
            className={cn(
              'rounded-full px-4 tabular-nums',
              restSec === sec && 'border-primary bg-primary/10 text-primary',
            )}
            onClick={() => onChoose(sec)}
          >
            {mmss(sec)}
          </Button>
        ))}
      </div>
    </div>
  )
}

function RestView({
  remaining,
  total,
  nextLabel,
  restSec,
  onChoose,
  onAdjust,
  onSkip,
}: {
  remaining: number
  total: number
  nextLabel: string
  restSec: number
  onChoose: (sec: number) => void
  onAdjust: (delta: number) => void
  onSkip: () => void
}) {
  const R = 46
  const C = 2 * Math.PI * R
  const frac = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6">
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Отдых</div>
      <div className="relative size-64 max-w-full">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="hsl(var(--secondary))" strokeWidth="5" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            className="transition-[stroke-dashoffset] duration-300 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl font-extrabold tabular-nums tracking-tight" aria-live="polite">
            {mmss(remaining)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="secondary" size="lg" className="rounded-full px-5" onClick={() => onAdjust(-15)}>
          <Minus /> 15 с
        </Button>
        <Button variant="secondary" size="lg" className="rounded-full px-5" onClick={() => onAdjust(15)}>
          <Plus /> 15 с
        </Button>
      </div>

      <RestPicker restSec={restSec} onChoose={onChoose} />

      <div className="text-sm text-muted-foreground">Далее: {nextLabel}</div>
      <Button variant="ghost" onClick={onSkip}>
        <SkipForward /> Пропустить отдых
      </Button>
    </div>
  )
}

// Новое состояние или восстановленное (тот же шаблон, упражнение и день).
function initialState(
  workout: Workout,
  exercise: Exercise,
  completed: ReturnType<typeof useCompletedWorkoutsContext>['completed'],
): RunState {
  const day = dayKey(new Date())
  const saved = loadRun()
  if (saved && saved.workoutId === workout.id && saved.exerciseId === exercise.id && saved.day === day)
    return saved

  // Вес и повторения — как в прошлый раз (этого человека), иначе из плана.
  const last = lastResult(
    completed.filter((r) => r.personId === workout.personId),
    exercise,
    day,
  )
  const base = exercise.sets.length
    ? exercise.sets.map((s, i) => ({ weight: last[i]?.weight ?? s.weight, reps: last[i]?.reps ?? s.reps }))
    : last.length
      ? last.map((s) => ({ weight: s.weight, reps: s.reps }))
      : [{ weight: 0, reps: 10 }]
  return {
    workoutId: workout.id,
    exerciseId: exercise.id,
    day,
    sets: base.map((s) => ({ ...s, done: false })),
    current: 0,
    phase: 'set',
    restEndsAt: null,
    restTotal: 0,
  }
}
