import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { PlanFields, planShape, planToValues, refinePlan, valuesToPlan } from './PlanFields'
import type { SetPlan, WorkoutSet } from '@/types'

interface Props {
  set: WorkoutSet | null // null — закрыт
  index: number
  totalSets: number
  onClose: () => void
  onSave: (plan: SetPlan, applyToAll: boolean) => void
}

const schema = z.object({ ...planShape, applyToAll: z.boolean() }).superRefine(refinePlan)
type FormValues = z.infer<typeof schema>

// Редактор плана одного подхода: точное значение или диапазон.
export function SetEditorSheet({ set, index, totalSets, onClose, onSave }: Props) {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (set) form.reset({ ...planToValues(set), applyToAll: false })
  }, [set, form])

  const applyToAll = form.watch('applyToAll')

  return (
    <Drawer open={set !== null} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Подход {index + 1}</DrawerTitle>
          <DrawerDescription>Точное значение или диапазон, например 8–12</DrawerDescription>
        </DrawerHeader>
        {set && (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => onSave(valuesToPlan(v), v.applyToAll))}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="overflow-y-auto overscroll-contain px-5 pt-2">
                <PlanFields />
                {totalSets > 1 && (
                  <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl bg-background/40 p-4">
                    <input
                      type="checkbox"
                      className="size-5 accent-[hsl(var(--primary))]"
                      checked={applyToAll}
                      onChange={(e) => form.setValue('applyToAll', e.target.checked)}
                    />
                    <span className="text-sm font-semibold">
                      Применить ко всем подходам ({totalSets})
                    </span>
                  </label>
                )}
              </div>
              <DrawerFooter className="grid grid-cols-2">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Отмена
                </Button>
                <Button type="submit">Сохранить</Button>
              </DrawerFooter>
            </form>
          </Form>
        )}
      </DrawerContent>
    </Drawer>
  )
}
