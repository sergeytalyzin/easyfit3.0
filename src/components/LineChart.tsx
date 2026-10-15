import { useId, useRef, type ReactNode } from 'react'
import { parseDayKey } from '@/utils/date'
import { cn } from '@/lib/utils'

export interface ChartPoint {
  date: string // YYYY-MM-DD
  value: number
}

const W = 300
const H = 100

// Позиции точек: X — пропорционально времени (пауза в месяц видна как пауза),
// Y — в шкале [lo, hi] с запасом, чтобы небольшие изменения не выглядели скачком.
function layout(points: ChartPoint[]) {
  const times = points.map((p) => parseDayKey(p.date).getTime())
  const t0 = times[0]
  const span = times[times.length - 1] - t0
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = max > min ? (max - min) * 0.25 : Math.max(1, Math.abs(max) * 0.1)
  const lo = min >= 0 ? Math.max(0, min - pad) : min - pad
  const hi = max + pad
  const y = (v: number) => 8 + (1 - (v - lo) / (hi - lo)) * (H - 16)
  return {
    min,
    max,
    y,
    xy: points.map((p, i) => ({
      x: span === 0 ? 50 : ((times[i] - t0) / span) * 100,
      y: y(p.value),
    })),
  }
}

interface Props {
  points: ChartPoint[]
  selected: number
  onSelect: (index: number) => void
  formatValue: (v: number) => string
  tooltip: (index: number) => ReactNode
  highlight?: (index: number) => boolean // например, рекорд — золотая точка
  className?: string
}

// Интерактивный линейный график: нажмите или проведите пальцем по графику —
// выбирается ближайшая точка, над ней подсказка со значением.
export function LineChart({
  points,
  selected,
  onSelect,
  formatValue,
  tooltip,
  highlight,
  className,
}: Props) {
  const gradientId = `lc${useId().replace(/:/g, '')}`
  const areaRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const { min, max, y, xy } = layout(points)

  const line = xy.map((p, i) => `${i ? 'L' : 'M'}${(p.x / 100) * W},${p.y}`).join(' ')
  const area = `${line} L${(xy[xy.length - 1].x / 100) * W},${H} L${(xy[0].x / 100) * W},${H} Z`
  const sel = xy[selected]

  function selectAt(clientX: number) {
    const rect = areaRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((clientX - rect.left) / rect.width) * 100
    let best = 0
    xy.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(xy[best].x - x)) best = i
    })
    if (best !== selected) onSelect(best)
  }

  const gridValues = max > min ? [max, min] : [max]

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex gap-2">
        {/* Шкала Y: реальные максимум и минимум за период */}
        <div className="relative w-10 shrink-0 text-right text-[10px] font-medium tabular-nums text-muted-foreground">
          {gridValues.map((v) => (
            <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${y(v)}%` }}>
              {formatValue(v)}
            </span>
          ))}
        </div>

        <div
          ref={areaRef}
          role="group"
          tabIndex={0}
          aria-label="График: стрелки влево и вправо выбирают тренировку"
          className="relative h-44 flex-1 cursor-crosshair touch-pan-y select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onPointerDown={(e) => {
            dragging.current = true
            selectAt(e.clientX)
          }}
          onPointerMove={(e) => {
            // Мышь — по наведению; палец/стилус — пока прижат.
            if (e.pointerType === 'mouse' || dragging.current) selectAt(e.clientX)
          }}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          onPointerLeave={() => (dragging.current = false)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' && selected > 0) onSelect(selected - 1)
            if (e.key === 'ArrowRight' && selected < points.length - 1) onSelect(selected + 1)
          }}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            {gridValues.map((v) => (
              <line
                key={v}
                x1="0"
                x2={W}
                y1={y(v)}
                y2={y(v)}
                stroke="hsl(var(--border))"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {points.length > 1 && (
              <>
                <path d={area} fill={`url(#${gradientId})`} />
                <path
                  d={line}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
            <line
              x1={(sel.x / 100) * W}
              x2={(sel.x / 100) * W}
              y1="0"
              y2={H}
              stroke="hsl(var(--primary))"
              strokeOpacity="0.4"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {xy.map((p, i) => (
            <span
              key={i}
              className={cn(
                'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-150',
                highlight?.(i) ? 'bg-amber-400' : 'bg-primary',
                i === selected
                  ? 'size-4 ring-4 ring-card shadow-[0_0_16px_hsl(var(--primary)/0.7)]'
                  : 'size-2.5 ring-2 ring-card',
              )}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            />
          ))}

          {/* Подсказка у выбранной точки; у краёв прижимается внутрь */}
          <div
            className={cn(
              'pointer-events-none absolute z-10 w-max max-w-[200px] rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-2xl',
              // Над точкой; если точка у верхнего края — под ней.
              sel.y < 45 ? 'mt-4' : '-mt-4 -translate-y-full',
              sel.x < 20 ? 'translate-x-[-12px]' : sel.x > 80 ? '-translate-x-[calc(100%-12px)]' : '-translate-x-1/2',
            )}
            style={{ left: `${sel.x}%`, top: `${sel.y}%` }}
            aria-live="polite"
          >
            {tooltip(selected)}
          </div>
        </div>
      </div>
    </div>
  )
}

// Мини-график для списка (без интерактива).
export function Sparkline({ points, className }: { points: ChartPoint[]; className?: string }) {
  if (points.length < 2) {
    return (
      <div className={cn('flex h-8 w-20 items-center', className)}>
        <span className="h-px w-full bg-border" />
      </div>
    )
  }
  const { xy } = layout(points)
  const line = xy.map((p, i) => `${i ? 'L' : 'M'}${(p.x / 100) * W},${p.y}`).join(' ')
  const last = xy[xy.length - 1]
  return (
    <div className={cn('relative h-8 w-20', className)} aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <path
          d={line}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
        style={{ left: `${last.x}%`, top: `${last.y}%` }}
      />
    </div>
  )
}
