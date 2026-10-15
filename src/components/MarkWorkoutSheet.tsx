import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Calendar } from './Calendar'
import { dayKey } from '@/utils/date'
import { cn } from '@/lib/utils'
import type { Workout } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  template: Workout
  markedKeys: Set<string>
  onSave: (dayKeyValue: string, exerciseIds: string[]) => void
}

// Отметить выполнение шаблона: выбрать дату, отметить сделанные упражнения,
// сохранить или отменить. Календарь внутри попапа — не мешает на экране.
export function MarkWorkoutSheet({
  open,
  onClose,
  template,
  markedKeys,
  onSave,
}: Props) {
  const [selectedDate, setSelectedDate] = useState(() => dayKey(new Date()))
  const [checked, setChecked] = useState<Set<string>>(new Set())

  // При открытии: дата — сегодня, все упражнения отмечены сделанными.
  useEffect(() => {
    if (open) {
      setSelectedDate(dayKey(new Date()))
      setChecked(new Set(template.exercises.map((e) => e.id)))
    }
  }, [open, template])

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function save() {
    if (checked.size === 0) return
    onSave(selectedDate, [...checked])
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="truncate">Отметить «{template.name}»</DrawerTitle>
          <DrawerDescription>Выберите день и упражнения — дальше внесёте фактические вес и повторения</DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
          <Calendar
            flat
            selectedKey={selectedDate}
            markedKeys={markedKeys}
            onSelect={setSelectedDate}
          />

          {template.exercises.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              В шаблоне пока нет упражнений.
            </p>
          ) : (
            <>
              <h3 className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Какие упражнения сделали?
              </h3>
              <div className="flex flex-col gap-1.5">
                {template.exercises.map((ex) => {
                  const on = checked.has(ex.id)
                  return (
                    <button
                      key={ex.id}
                      className={cn(
                        'flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition-colors',
                        on
                          ? 'border-primary/40 bg-primary/10'
                          : 'border-transparent bg-background/40 opacity-60',
                      )}
                      onClick={() => toggle(ex.id)}
                      aria-pressed={on}
                    >
                      <span
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                          on ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50',
                        )}
                      >
                        {on && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                        {ex.name || 'Без названия'}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">
                        {ex.sets.length} подх.
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <DrawerFooter className="grid grid-cols-2">
          <Button variant="secondary" onClick={onClose}>
            Отменить
          </Button>
          <Button disabled={checked.size === 0} onClick={save}>
            Записать результат
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
