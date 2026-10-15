import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dayKey, parseDayKey } from '@/utils/date'
import { cn } from '@/lib/utils'

interface Props {
  selectedKey: string // выбранный день YYYY-MM-DD
  markedKeys: Set<string> // дни, в которые есть выполненные тренировки
  onSelect: (key: string) => void
  flat?: boolean // без фона-карточки — для встраивания в шит
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// Календарь месяца: навигация по месяцам, точки на днях с тренировками.
// Без сторонних библиотек.
export function Calendar({ selectedKey, markedKeys, onSelect, flat }: Props) {
  const initial = parseDayKey(selectedKey)
  const [view, setView] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  })

  const todayKey = dayKey(new Date())
  const first = new Date(view.year, view.month, 1)
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  // Сдвиг: делаем неделю с понедельника (JS getDay: 0 = воскресенье).
  const lead = (first.getDay() + 6) % 7

  const monthLabel = first.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  function shiftMonth(delta: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const cells: Array<number | null> = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className={cn(!flat && 'rounded-3xl border border-border/70 bg-card p-4')}>
      <div className="mb-2 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
          <ChevronLeft />
        </Button>
        <span className="text-base font-bold first-letter:uppercase">{monthLabel}</span>
        <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {w}
          </span>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <span key={`e${i}`} />
          const key = dayKey(new Date(view.year, view.month, day))
          const isSelected = key === selectedKey
          const isToday = key === todayKey
          const marked = markedKeys.has(key)
          return (
            <button
              key={key}
              className={cn(
                'relative mx-auto flex size-10 items-center justify-center rounded-full text-[15px] font-medium tabular-nums transition-colors',
                isSelected
                  ? 'bg-primary font-bold text-primary-foreground'
                  : 'hover:bg-accent',
                isToday && !isSelected && 'font-bold text-primary ring-1 ring-primary/40',
              )}
              onClick={() => onSelect(key)}
              aria-pressed={isSelected}
            >
              {day}
              {marked && (
                <span
                  className={cn(
                    'absolute bottom-1 size-1 rounded-full',
                    isSelected ? 'bg-primary-foreground' : 'bg-primary',
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
