import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CalendarCheck,
  ChevronRight,
  Dumbbell,
  Flame,
  Hand,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { usePeopleContext } from '@/hooks/PeopleContext'
import { useCompletedWorkoutsContext } from '@/hooks/CompletedWorkoutsContext'
import { useExerciseCatalogContext } from '@/hooks/ExerciseCatalogContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Sparkline } from '@/components/LineChart'
import { VerdictBadge } from '@/components/VerdictBadge'
import { Segmented } from '@/components/PlanFields'
import type { CompletedWorkout } from '@/types'
import { dayKey, formatDayKey, parseDayKey, startOfWeek } from '@/utils/date'
import { exercisesVolume, weekStreak } from '@/utils/workouts'
import { buildProgress, metricValue, verdictFor, type ExerciseProgress } from '@/utils/progress'
import { cn } from '@/lib/utils'

const DAYS = 14

export function ProgressPage() {
  const { personId = '' } = useParams()
  const navigate = useNavigate()
  const { people } = usePeopleContext()
  const { completed, deleteCompletedByPerson } = useCompletedWorkoutsContext()
  const { catalog } = useExerciseCatalogContext()
  const [clearOpen, setClearOpen] = useState(false)

  const person = people.find((p) => p.id === personId)
  // Выполненные тренировки человека, свежие сверху.
  const own = completed
    .filter((c) => c.personId === personId)
    .sort((a, b) =>
      a.date === b.date
        ? b.createdAt.localeCompare(a.createdAt)
        : b.date.localeCompare(a.date),
    )

  // Прогресс по упражнениям — только по реально выполненным подходам.
  const progress = buildProgress(own, catalog)

  return (
    <div className="flex flex-col gap-5 pb-4">
      <PageHeader onBack={() => navigate(`/person/${personId}`)} />

      <div>
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight sm:text-5xl">
          Прогресс
        </h1>
        {person && <p className="mt-1 text-sm font-medium text-muted-foreground">{person.name}</p>}
      </div>

      {own.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <CalendarCheck className="size-7" />
          </span>
          <p className="text-lg font-bold">Пока нет выполненных тренировок</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Откройте шаблон и нажмите «Отметить выполнение» — здесь появятся
            статистика и графики.
          </p>
        </Card>
      ) : (
        <>
          <SummaryTiles items={own} />
          <ActivityChart items={own} personId={personId} />

          <section className="flex flex-col gap-3">
            <SectionTitle hint="Нажмите на упражнение — откроется динамика">
              Упражнения
            </SectionTitle>
            {progress.length === 0 ? (
              <Card className="p-5 text-sm text-muted-foreground">
                Нет отмеченных подходов. Откройте тренировку из истории и отметьте ✓
                выполненные подходы.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {progress.map((p, i) => (
                  <ExerciseRow key={p.key} progress={p} personId={personId} index={i} />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle>История</SectionTitle>
            <div className="flex flex-col gap-2">
              {own.map((c, i) => (
                <HistoryRow key={c.id} record={c} personId={personId} index={i} />
              ))}
            </div>
          </section>

          <Button
            variant="ghost"
            size="lg"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setClearOpen(true)}
          >
            <Trash2 /> Очистить прогресс
          </Button>

          <ConfirmDialog
            open={clearOpen}
            onOpenChange={setClearOpen}
            title="Очистить весь прогресс?"
            description="Все выполненные тренировки этого человека будут удалены. Шаблоны останутся."
            confirmLabel="Очистить"
            onConfirm={() => deleteCompletedByPerson(personId)}
          />
        </>
      )}
    </div>
  )
}

function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mt-2 flex items-baseline justify-between gap-3 px-1">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {children}
      </h2>
      {hint && (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
          <Hand className="size-3" /> {hint}
        </span>
      )}
    </div>
  )
}

// Ключевые показатели: всего, за месяц, тоннаж за 30 дней, серия недель.
function SummaryTiles({ items }: { items: CompletedWorkout[] }) {
  const today = new Date()
  const monthKey = dayKey(today).slice(0, 7)
  const since = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)
  const sinceKey = dayKey(since)
  const thisMonth = items.filter((c) => c.date.slice(0, 7) === monthKey).length
  const volume30 = items
    .filter((c) => c.date >= sinceKey)
    .reduce((sum, c) => sum + exercisesVolume(c.exercises), 0)
  const streak = weekStreak(items.map((c) => c.date), today)

  const tiles = [
    { icon: <Dumbbell />, value: items.length.toString(), label: 'Всего тренировок' },
    { icon: <CalendarCheck />, value: thisMonth.toString(), label: 'В этом месяце' },
    {
      icon: <TrendingUp />,
      value: Math.round(volume30).toLocaleString('ru-RU'),
      label: 'Объём за 30 дней, кг',
    },
    {
      icon: <Flame />,
      value: streak.toString(),
      label: streak === 1 ? 'Неделя подряд' : 'Недель подряд',
      accent: streak > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t, i) => (
        <Card
          key={t.label}
          className="flex flex-col gap-3 p-4 animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <span
            className={cn(
              'flex size-9 items-center justify-center rounded-xl [&_svg]:size-[18px]',
              t.accent ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
            )}
          >
            {t.icon}
          </span>
          <div>
            <div className="text-[28px] font-extrabold leading-none tracking-tight tabular-nums">
              {t.value}
            </div>
            <div className="mt-1.5 text-xs font-medium text-muted-foreground">{t.label}</div>
          </div>
        </Card>
      ))}
    </div>
  )
}

type ActivityMode = 'weeks' | 'days'
const WEEKS = 12

interface Bucket {
  from: string // YYYY-MM-DD включительно
  to: string
  label: string // подпись под столбиком
  sub?: string // месяц — под первой неделей месяца
  title: string // заголовок выбранного периода
}

const monthShort = (d: Date) => d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')

// Столбики: 12 недель (пн–вс) или 14 дней, последний — текущий.
function buckets(mode: ActivityMode, today: Date): Bucket[] {
  if (mode === 'days') {
    return Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (DAYS - 1 - i))
      const key = dayKey(d)
      return { from: key, to: key, label: String(d.getDate()), title: formatDayKey(key) }
    })
  }
  const thisWeek = startOfWeek(today)
  return Array.from({ length: WEEKS }, (_, i) => {
    const start = new Date(thisWeek)
    start.setDate(start.getDate() - 7 * (WEEKS - 1 - i))
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const prevMonth = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7).getMonth()
    return {
      from: dayKey(start),
      to: dayKey(end),
      label: String(start.getDate()),
      sub: i === 0 || prevMonth !== start.getMonth() ? monthShort(start) : undefined,
      title: `${formatDayKey(dayKey(start))} – ${formatDayKey(dayKey(end))}`,
    }
  })
}

// Активность: тренировки по неделям (по умолчанию) или по дням. Нажатие на
// столбик — список тренировок за этот период. Выбран последний период с тренировкой.
function ActivityChart({ items, personId }: { items: CompletedWorkout[]; personId: string }) {
  const [mode, setMode] = useState<ActivityMode>('weeks')
  const list = buckets(mode, new Date())
  const inBucket = (c: CompletedWorkout, b: Bucket) => c.date >= b.from && c.date <= b.to
  const counts = list.map((b) => items.filter((c) => inBucket(c, b)).length)
  const max = Math.max(1, ...counts)
  const total = counts.reduce((a, b) => a + b, 0)
  const active = counts.filter(Boolean).length
  const lastActive = counts.reduce((acc, c, i) => (c > 0 ? i : acc), list.length - 1)
  const [picked, setPicked] = useState<{ mode: ActivityMode; index: number } | null>(null)
  // При смене режима — снова последний период с тренировкой.
  const sel = picked?.mode === mode ? picked.index : lastActive
  const selItems = items.filter((c) => inBucket(c, list[sel]))

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Активность
          </div>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'weeks', label: `${WEEKS} недель` },
              { value: 'days', label: `${DAYS} дней` },
            ]}
          />
        </div>
        <div className="text-right">
          {mode === 'weeks' ? (
            <>
              <div className="text-2xl font-extrabold leading-none tabular-nums">
                {(total / WEEKS).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">трен. в неделю</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-extrabold leading-none tabular-nums">
                {active}
                <span className="text-base text-muted-foreground">/{DAYS}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">активных дней</div>
            </>
          )}
        </div>
      </div>

      <div className="relative mt-4 flex h-36 items-end gap-1.5">
        {total === 0 && (
          <p className="absolute inset-x-0 top-6 text-center text-sm text-muted-foreground">
            {mode === 'weeks' ? `За ${WEEKS} недель` : `За ${DAYS} дней`} тренировок не было
          </p>
        )}
        {list.map((b, i) => (
          <button
            key={b.from}
            className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-lg pt-1 transition-colors hover:bg-accent/40"
            onClick={() => setPicked({ mode, index: i })}
            aria-label={`${b.title}: ${counts[i]} трен.`}
            aria-pressed={i === sel}
          >
            {counts[i] > 0 && (
              <span className={cn('text-[10px] font-bold tabular-nums', i === sel ? 'text-primary' : 'text-muted-foreground')}>
                {counts[i]}
              </span>
            )}
            <span
              className={cn(
                'w-full max-w-4 rounded-full transition-all duration-500',
                counts[i] === 0 ? 'h-1.5 bg-secondary' : 'bg-gradient-to-t from-primary/50 to-primary',
                i === sel && counts[i] > 0 && 'shadow-[0_0_16px_hsl(var(--primary)/0.6)]',
                i === sel && counts[i] === 0 && 'bg-muted-foreground/60',
              )}
              style={counts[i] ? { height: `${(counts[i] / max) * 62}%` } : undefined}
            />
            <span
              className={cn(
                'rounded-md px-0.5 text-[10px] tabular-nums',
                i === sel ? 'bg-primary font-bold text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {b.label}
            </span>
            <span className="h-3 text-[9px] leading-3 text-muted-foreground/80">{b.sub ?? ''}</span>
          </button>
        ))}
      </div>

      {/* Что было в выбранный период */}
      <div className="mt-3 border-t border-border/60 pt-3">
        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span className="first-letter:uppercase">{list[sel].title}</span>
          <span className="flex items-center gap-1 font-normal text-muted-foreground/80">
            <Hand className="size-3" /> Нажмите на столбик
          </span>
        </div>
        {selItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет тренировок</p>
        ) : (
          <div className="flex flex-col">
            {selItems.map((c) => (
              <Link
                key={c.id}
                to={`/person/${personId}/completed/${c.id}`}
                className="-mx-2 flex items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-accent/40"
              >
                <span className="size-2 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.name || 'Без названия'}</span>
                {mode === 'weeks' && (
                  <span className="text-xs tabular-nums text-muted-foreground">{formatDayKey(c.date)}</span>
                )}
                <span className="text-xs tabular-nums text-muted-foreground">{c.exercises.length} упр.</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// Строка упражнения: текущий результат, итог последней тренировки, мини-график.
function ExerciseRow({ progress: p, personId, index }: { progress: ExerciseProgress; personId: string; index: number }) {
  const last = p.sessions[p.sessions.length - 1]
  const metric = p.bodyweight ? 'reps' : 'strength'
  const value = p.bodyweight
    ? `${last.maxReps} повт.`
    : `${last.topWeight.toLocaleString('ru-RU')} кг × ${last.topReps}`
  return (
    <Link
      to={`/person/${personId}/progress/${encodeURIComponent(p.key)}`}
      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <Card className="flex items-center gap-3 p-4 pr-3 transition-colors hover:bg-accent/40 active:scale-[0.99]">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-bold">{p.name}</div>
          <div className="mt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {value} · {p.sessions.length} трен.
          </div>
          <VerdictBadge verdict={verdictFor(p, p.sessions.length - 1)} className="mt-2" />
        </div>
        <Sparkline points={p.sessions.map((s) => ({ date: s.date, value: metricValue(s, metric, p.bodyweight) }))} />
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </Card>
    </Link>
  )
}

function HistoryRow({
  record,
  personId,
  index,
}: {
  record: CompletedWorkout
  personId: string
  index: number
}) {
  const date = parseDayKey(record.date)
  const volume = exercisesVolume(record.exercises)
  return (
    <Link
      to={`/person/${personId}/completed/${record.id}`}
      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <Card className="flex items-center gap-4 p-3 pr-4 transition-colors hover:bg-accent/40 active:scale-[0.99]">
        <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-secondary">
          <span className="text-xl font-extrabold leading-none tabular-nums">{date.getDate()}</span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            {date.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-bold">{record.name || 'Без названия'}</div>
          <div className="mt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {record.exercises.length} упр.
            {volume > 0 && ` · ${Math.round(volume).toLocaleString('ru-RU')} кг`}
          </div>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </Card>
    </Link>
  )
}
