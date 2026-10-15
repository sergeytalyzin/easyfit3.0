import { Controller, useFormContext, type FieldPath } from 'react-hook-form'
import { z } from 'zod'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { SetPlan } from '@/types'

// Поля плана подхода (вес и повторения: точно или диапазоном) — общие для
// редактора подхода и создания нескольких подходов.

export const planShape = {
  weight: z.number().min(0).max(1000),
  weightRange: z.boolean(),
  weightMax: z.number().min(0).max(1000),
  reps: z.number().int().min(0).max(1000),
  repsRange: z.boolean(),
  repsMax: z.number().int().min(0).max(1000),
}
export type PlanValues = { [K in keyof typeof planShape]: z.infer<(typeof planShape)[K]> }

export function refinePlan(v: PlanValues, ctx: z.RefinementCtx) {
  if (v.weightRange && v.weightMax <= v.weight)
    ctx.addIssue({ code: 'custom', path: ['weightMax'], message: 'Верхняя граница должна быть больше' })
  if (v.repsRange && v.repsMax <= v.reps)
    ctx.addIssue({ code: 'custom', path: ['repsMax'], message: 'Верхняя граница должна быть больше' })
}

export function planToValues(p: SetPlan): PlanValues {
  return {
    weight: p.weight,
    weightRange: p.weightMax !== undefined && p.weightMax > p.weight,
    weightMax: p.weightMax ?? p.weight + 10,
    reps: p.reps,
    repsRange: p.repsMax !== undefined && p.repsMax > p.reps,
    repsMax: p.repsMax ?? p.reps + 4,
  }
}

export function valuesToPlan(v: PlanValues): SetPlan {
  return {
    weight: v.weight,
    weightMax: v.weightRange ? v.weightMax : undefined,
    reps: v.reps,
    repsMax: v.repsRange ? v.repsMax : undefined,
  }
}

export function PlanFields() {
  return (
    <div className="grid gap-5">
      <RangeField label="Вес, кг" min="weight" max="weightMax" range="weightRange" step={2.5} decimal />
      <RangeField label="Повторения" min="reps" max="repsMax" range="repsRange" step={1} />
    </div>
  )
}

function RangeField({
  label,
  min,
  max,
  range,
  step,
  decimal,
}: {
  label: string
  min: FieldPath<PlanValues>
  max: FieldPath<PlanValues>
  range: FieldPath<PlanValues>
  step: number
  decimal?: boolean
}) {
  const { control, watch, setValue, getValues, formState } = useFormContext<PlanValues>()
  const isRange = watch(range) as boolean
  const error = formState.errors[max]?.message

  function setMode(next: boolean) {
    // При включении диапазона верх по умолчанию чуть выше низа.
    if (next && (getValues(max) as number) <= (getValues(min) as number))
      setValue(max, (getValues(min) as number) + step * 4)
    setValue(range, next, { shouldValidate: true })
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <Segmented
          value={isRange}
          onChange={setMode}
          options={[
            { value: false, label: 'Точно' },
            { value: true, label: 'Диапазон' },
          ]}
        />
      </div>
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name={min}
          render={({ field }) => (
            <Stepper value={field.value as number} onChange={field.onChange} step={step} decimal={decimal} label={isRange ? `${label}, от` : label} />
          )}
        />
        {isRange && (
          <>
            <span className="text-muted-foreground">–</span>
            <Controller
              control={control}
              name={max}
              render={({ field }) => (
                <Stepper value={field.value as number} onChange={field.onChange} step={step} decimal={decimal} label={`${label}, до`} invalid={!!error} />
              )}
            />
          </>
        )}
      </div>
      {error && <p className="text-sm font-medium text-destructive">{String(error)}</p>}
    </div>
  )
}

// Поле числа с кнопками ±. Большие зоны нажатия для использования в зале.
export function Stepper({
  value,
  onChange,
  step,
  decimal,
  label,
  invalid,
  min = 0,
}: {
  value: number
  onChange: (v: number) => void
  step: number
  decimal?: boolean
  label: string
  invalid?: boolean
  min?: number
}) {
  const round = (n: number) => Math.round(n * 100) / 100
  return (
    <div
      className={cn(
        'flex h-12 min-w-0 flex-1 items-center rounded-xl border border-transparent bg-input transition-colors focus-within:border-primary/60',
        invalid && 'border-destructive/70',
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-12 shrink-0 rounded-xl text-muted-foreground"
        onClick={() => onChange(Math.max(min, round(value - step)))}
        aria-label={`${label}: уменьшить`}
      >
        <Minus />
      </Button>
      <input
        className="no-spin w-full min-w-0 bg-transparent text-center text-lg font-bold tabular-nums outline-none"
        type="number"
        inputMode={decimal ? 'decimal' : 'numeric'}
        min={min}
        step={step}
        value={value}
        aria-label={label}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-12 shrink-0 rounded-xl text-muted-foreground"
        onClick={() => onChange(round(value + step))}
        aria-label={`${label}: увеличить`}
      >
        <Plus />
      </Button>
    </div>
  )
}

// Переключатель из 2–3 вариантов (без доп. зависимостей).
export function Segmented<T extends string | boolean>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <div role="radiogroup" className={cn('inline-flex rounded-xl bg-input p-1', className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={cn(
            'flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
            o.value === value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
