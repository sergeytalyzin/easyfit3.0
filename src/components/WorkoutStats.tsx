import type { Exercise } from '@/types'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { exercisesVolume } from '@/utils/workouts'

// Сводка тренировки: упражнения, подходы и тоннаж (вес × повторения).
export function WorkoutStats({ exercises }: { exercises: Exercise[] }) {
  const sets = exercises.reduce((n, e) => n + e.sets.length, 0)
  const volume = exercisesVolume(exercises)

  const items = [
    { label: 'Упражнения', value: exercises.length.toString() },
    { label: 'Подходы', value: sets.toString() },
    { label: 'Объём, кг', value: Math.round(volume).toLocaleString('ru-RU'), accent: true },
  ]

  return (
    <Card className="grid grid-cols-3 divide-x divide-border/70 py-4">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col items-center gap-1 px-2">
          <span
            className={cn(
              'text-2xl font-extrabold tabular-nums tracking-tight sm:text-3xl',
              it.accent ? 'text-primary' : 'text-foreground',
            )}
          >
            {it.value}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {it.label}
          </span>
        </div>
      ))}
    </Card>
  )
}
