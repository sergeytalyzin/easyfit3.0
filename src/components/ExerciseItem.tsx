import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { CheckCheck, ChevronDown, ChevronsUpDown, Layers, Plus, Timer, X } from 'lucide-react'
import type { Exercise, WorkoutSet } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SetRow, type SetMode } from './SetRow'
import { groupSets, isEffectiveSet, summarizeSets } from '@/utils/sets'
import { cn } from '@/lib/utils'

interface Props {
  exercise: Exercise
  mode: SetMode
  defaultOpen?: boolean
  onPickName: () => void // открыть выбор упражнения из справочника
  onDelete: () => void
  onAddSet: () => void
  onBulkAdd: () => void // план: несколько подходов сразу
  onEditSet: (setId: string) => void // план: редактор подхода
  onUpdateSet: (setId: string, patch: Partial<Omit<WorkoutSet, 'id'>>) => void
  onDeleteSet: (setId: string) => void
  onSwipeRight?: () => void // свайп вправо по карточке — экран таймера отдыха
}

const SWIPE_TRIGGER = 80 // px, после которых свайп срабатывает
const EDGE_GUARD = 24 // px у левого края — там системный жест «назад»

export function ExerciseItem({
  exercise,
  mode,
  defaultOpen = false,
  onPickName,
  onDelete,
  onAddSet,
  onBulkAdd,
  onEditSet,
  onUpdateSet,
  onDeleteSet,
  onSwipeRight,
}: Props) {
  const swipe = useSwipeRight(onSwipeRight)
  // По умолчанию свёрнуто — список компактный; при записи факта — развёрнуто.
  const [open, setOpen] = useState(defaultOpen)
  const { sets } = exercise
  const doneCount = sets.filter((s) => s.done !== false).length

  return (
    <div className="relative">
      {onSwipeRight && swipe.dx > 0 && (
        <div
          className="absolute inset-0 flex items-center gap-2 rounded-3xl bg-primary pl-6 font-bold text-primary-foreground"
          style={{ opacity: Math.min(1, swipe.dx / SWIPE_TRIGGER) }}
          aria-hidden="true"
        >
          <Timer className="size-5" /> Таймер отдыха
        </div>
      )}
      <Card
        className={cn(
          'relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300',
          onSwipeRight && 'touch-pan-y',
          swipe.dx === 0 && 'transition-transform duration-200',
        )}
        style={swipe.dx ? { transform: `translateX(${swipe.dx}px)` } : undefined}
        {...swipe.handlers}
      >
        <div className="flex items-center gap-1 p-2 pr-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Свернуть упражнение' : 'Развернуть упражнение'}
          >
            <ChevronDown className={cn('transition-transform duration-200', open && 'rotate-180')} />
          </Button>

          <button className="group min-w-0 flex-1 rounded-xl px-1 py-1 text-left" onClick={onPickName}>
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  'truncate text-[17px] font-bold leading-tight',
                  exercise.name ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {exercise.name || 'Выберите упражнение'}
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
            </span>
            <span className="mt-0.5 block truncate text-xs font-medium tabular-nums text-muted-foreground">
              {mode === 'plan' ? planSummary(sets) : factSummary(sets, doneCount)}
            </span>
          </button>

          <Button
            variant="secondary"
            size="icon"
            className="size-8 shrink-0 rounded-full text-muted-foreground"
            onClick={onDelete}
            aria-label="Удалить упражнение"
          >
            <X className="!size-4" />
          </Button>
        </div>

        {open && (
          <div className="border-t border-border/60 px-3 pb-3 pt-2 animate-in fade-in">
            {sets.map((set, i) => (
              <SetRow
                key={set.id}
                index={i}
                set={set}
                mode={mode}
                onChange={(patch) => onUpdateSet(set.id, patch)}
                onEdit={() => onEditSet(set.id)}
                onDelete={() => onDeleteSet(set.id)}
              />
            ))}

            <div className="mt-2 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                // Пустой шаблон — сразу схема из нескольких подходов.
                onClick={mode === 'plan' && sets.length === 0 ? onBulkAdd : onAddSet}
              >
                <Plus /> Подход
              </Button>
              {mode === 'plan' && sets.length > 0 && (
                <Button variant="secondary" className="flex-1" onClick={onBulkAdd}>
                  <Layers /> Несколько
                </Button>
              )}
              {mode === 'fact' && sets.length > 0 && doneCount < sets.length && (
                <Button
                  variant="secondary"
                  className="flex-1 text-primary"
                  onClick={() => sets.forEach((s) => s.done === false && onUpdateSet(s.id, { done: true }))}
                >
                  <CheckCheck /> Отметить все
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

// Горизонтальный свайп вправо: срабатывает, только если жест явно
// горизонтальный, и гасит клик, который браузер пришлёт после свайпа.
function useSwipeRight(onSwipe?: () => void) {
  const [dx, setDx] = useState(0)
  const start = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null)
  const suppressClick = useRef(false)

  function reset() {
    start.current = null
    setDx(0)
  }

  const handlers = onSwipe
    ? {
        onPointerDown(e: PointerEvent) {
          if (e.pointerType === 'mouse' && e.button !== 0) return
          if (e.clientX < EDGE_GUARD) return
          start.current = { x: e.clientX, y: e.clientY, horizontal: null }
          suppressClick.current = false
        },
        onPointerMove(e: PointerEvent) {
          const s = start.current
          if (!s) return
          const ddx = e.clientX - s.x
          const ddy = e.clientY - s.y
          if (s.horizontal === null && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) {
            s.horizontal = ddx > 0 && Math.abs(ddx) > Math.abs(ddy) * 1.5
            if (!s.horizontal) return reset()
          }
          if (s.horizontal) {
            suppressClick.current = true
            setDx(Math.min(Math.max(ddx, 0), SWIPE_TRIGGER * 1.5))
          }
        },
        onPointerUp() {
          const fire = start.current?.horizontal && dx >= SWIPE_TRIGGER
          reset()
          if (fire) onSwipe()
        },
        onPointerCancel: reset,
        onClickCapture(e: MouseEvent) {
          if (suppressClick.current) {
            e.preventDefault()
            e.stopPropagation()
            suppressClick.current = false
          }
        },
      }
    : {}

  return { dx, handlers }
}

// «6 × 10 · 20 кг»; разные подходы — группами: «2 × 6–8 · 80 кг, 1 × 10 · 70 кг».
// В одну строку влезают две группы; при трёх и более — первая и «ещё N подх.».
function planSummary(sets: WorkoutSet[]): string {
  if (sets.length === 0) return 'Нет подходов'
  const { lines, moreSets } = summarizeSets(sets, groupSets(sets).length > 2 ? 1 : 2)
  return lines.join(', ') + (moreSets ? `, ещё ${moreSets} подх.` : '')
}

function factSummary(sets: WorkoutSet[], doneCount: number): string {
  if (sets.length === 0) return 'Нет подходов'
  const effective = sets.filter(isEffectiveSet)
  const max = effective.length ? Math.max(...effective.map((s) => s.weight)) : 0
  return `${doneCount}/${sets.length} выполнено${max > 0 ? ` · макс ${max.toLocaleString('ru-RU')} кг` : ''}`
}
