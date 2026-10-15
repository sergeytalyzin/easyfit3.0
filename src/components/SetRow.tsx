import { Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPlan, formatRange } from '@/utils/sets'
import { cn } from '@/lib/utils'
import type { WorkoutSet } from '@/types'

export type SetMode = 'plan' | 'fact'

interface Props {
  index: number
  set: WorkoutSet
  mode: SetMode
  onChange: (patch: Partial<Omit<WorkoutSet, 'id'>>) => void
  onEdit: () => void // план: открыть редактор подхода
  onDelete: () => void
}

export function SetRow({ index, set, mode, onChange, onEdit, onDelete }: Props) {
  const done = set.done !== false
  return (
    <div className="py-1 animate-in fade-in slide-in-from-top-1">
      <div className="flex items-center gap-2">
        {mode === 'fact' ? (
          <button
            type="button"
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold tabular-nums transition-colors',
              done
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/40 text-muted-foreground',
            )}
            onClick={() => onChange({ done: !done })}
            aria-pressed={done}
            aria-label={`Подход ${index + 1}: ${done ? 'выполнен' : 'не выполнен'}`}
          >
            {done ? <Check className="size-4" strokeWidth={3} /> : index + 1}
          </button>
        ) : (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold tabular-nums text-muted-foreground">
            {index + 1}
          </span>
        )}

        {mode === 'plan' ? (
          <button
            type="button"
            className="flex h-12 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl bg-input px-4 text-left transition-colors hover:bg-accent"
            onClick={onEdit}
            aria-label={`Изменить подход ${index + 1}`}
          >
            <span className="truncate text-base font-bold tabular-nums">
              {formatRange(set.weight, set.weightMax)}
              <span className="ml-1 text-xs font-medium text-muted-foreground">кг</span>
              <span className="mx-2 text-muted-foreground">×</span>
              {formatRange(set.reps, set.repsMax)}
              <span className="ml-1 text-xs font-medium text-muted-foreground">повт</span>
            </span>
            <Pencil className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        ) : (
          <>
            <NumberField
              value={set.weight}
              unit="кг"
              step={2.5}
              inputMode="decimal"
              label={`Вес, подход ${index + 1}`}
              dim={!done}
              onChange={(weight) => onChange({ weight })}
            />
            <span className="shrink-0 text-muted-foreground">×</span>
            <NumberField
              value={set.reps}
              unit="повт"
              step={1}
              inputMode="numeric"
              label={`Повторения, подход ${index + 1}`}
              dim={!done}
              onChange={(reps) => onChange({ reps })}
            />
          </>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground"
          onClick={onDelete}
          aria-label="Удалить подход"
        >
          <X className="!size-4" />
        </Button>
      </div>

      {mode === 'fact' && set.plan && (
        <div className="ml-11 mt-1 text-[11px] font-medium tabular-nums text-muted-foreground">
          план: {formatPlan(set.plan)}
        </div>
      )}
    </div>
  )
}

function NumberField({
  value,
  unit,
  step,
  inputMode,
  label,
  dim,
  onChange,
}: {
  value: number
  unit: string
  step: number
  inputMode: 'decimal' | 'numeric'
  label: string
  dim?: boolean
  onChange: (value: number) => void
}) {
  return (
    <label
      className={cn(
        'flex h-12 min-w-0 flex-1 items-baseline gap-1 rounded-xl border border-transparent bg-input px-3 pt-[11px] transition-colors focus-within:border-primary/60',
        dim && 'opacity-60',
      )}
    >
      <input
        className="no-spin w-full min-w-0 bg-transparent text-right text-lg font-bold tabular-nums text-foreground outline-none placeholder:text-muted-foreground/60"
        type="number"
        inputMode={inputMode}
        min={0}
        step={step}
        value={value === 0 ? '' : value}
        placeholder="0"
        aria-label={label}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{unit}</span>
    </label>
  )
}
