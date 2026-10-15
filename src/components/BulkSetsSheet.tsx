import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PlanFields, Stepper, planShape, planToValues, refinePlan, valuesToPlan } from './PlanFields'
import { formatPlan } from '@/utils/sets'
import { cn } from '@/lib/utils'
import type { SetPlan } from '@/types'

interface Props {
  open: boolean
  exerciseName: string
  initial: SetPlan // стартовые значения (последний подход упражнения или пусто)
  onClose: () => void
  onAdd: (count: number, plan: SetPlan) => void
}

// Готовые схемы: подходы × повторения.
const PRESETS = [
  { count: 3, reps: 8, repsMax: 12 },
  { count: 4, reps: 6, repsMax: 8 },
  { count: 5, reps: 5 },
  { count: 3, reps: 12, repsMax: 15 },
  { count: 3, reps: 10 },
]

const schema = z.object({ ...planShape, count: z.number().int().min(1).max(10) }).superRefine(refinePlan)
type FormValues = z.infer<typeof schema>

const plural = (n: number) =>
  n % 10 === 1 && n % 100 !== 11 ? 'подход' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'подхода' : 'подходов'

// Создание сразу нескольких одинаковых подходов: «3 × 8–12 по 60 кг».
export function BulkSetsSheet({ open, exerciseName, initial, onClose, onAdd }: Props) {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  // Сброс только при открытии: initial — новый объект на каждый рендер.
  useEffect(() => {
    if (open) form.reset({ ...planToValues(initial), count: 3 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const v = form.watch()
  const ready = open && v.count !== undefined

  function applyPreset(p: (typeof PRESETS)[number]) {
    form.setValue('count', p.count)
    form.setValue('reps', p.reps)
    form.setValue('repsRange', p.repsMax !== undefined)
    if (p.repsMax !== undefined) form.setValue('repsMax', p.repsMax)
    form.clearErrors()
  }

  const isPreset = (p: (typeof PRESETS)[number]) =>
    v.count === p.count &&
    v.reps === p.reps &&
    v.repsRange === (p.repsMax !== undefined) &&
    (p.repsMax === undefined || v.repsMax === p.repsMax)

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Подходы</DrawerTitle>
          <DrawerDescription className="truncate">{exerciseName || 'Упражнение'}</DrawerDescription>
        </DrawerHeader>
        {ready && (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => onAdd(values.count, valuesToPlan(values)))}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="grid gap-5 overflow-y-auto overscroll-contain px-5 pt-2">
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <Button
                      key={`${p.count}-${p.reps}-${p.repsMax ?? ''}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        'rounded-full px-4 tabular-nums',
                        isPreset(p) && 'border-primary bg-primary/10 text-primary',
                      )}
                      onClick={() => applyPreset(p)}
                    >
                      {p.count}×{p.reps}
                      {p.repsMax ? `–${p.repsMax}` : ''}
                    </Button>
                  ))}
                </div>

                <div className="grid gap-2">
                  <Label>Количество подходов</Label>
                  <Stepper
                    value={v.count}
                    onChange={(n) => form.setValue('count', Math.min(10, Math.max(1, n)))}
                    step={1}
                    min={1}
                    label="Количество подходов"
                  />
                </div>

                <PlanFields />
              </div>

              <DrawerFooter>
                <Button type="submit" size="lg">
                  <Plus /> Добавить {v.count} {plural(v.count)}
                </Button>
                <p className="text-center text-xs text-muted-foreground tabular-nums">
                  {formatPlan(valuesToPlan(v))} · каждый можно изменить отдельно
                </p>
              </DrawerFooter>
            </form>
          </Form>
        )}
      </DrawerContent>
    </Drawer>
  )
}
