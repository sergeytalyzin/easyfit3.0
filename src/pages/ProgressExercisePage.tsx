import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, ChevronsUpDown, Hand, Info, Trophy } from 'lucide-react'
import { useCompletedWorkoutsContext } from '@/hooks/CompletedWorkoutsContext'
import { useExerciseCatalogContext } from '@/hooks/ExerciseCatalogContext'
import { Card } from '@/components/ui/card'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { PageHeader } from '@/components/PageHeader'
import { LineChart } from '@/components/LineChart'
import { Segmented } from '@/components/PlanFields'
import { VerdictBadge } from '@/components/VerdictBadge'
import { dayKey, formatDayKey } from '@/utils/date'
import { exerciseNameKey } from '@/utils/exercises'
import {
  buildProgress,
  metricValue,
  verdictFor,
  type ExerciseProgress,
  type Metric,
} from '@/utils/progress'

type Period = '30' | '90' | 'all'

const n = (v: number) => v.toLocaleString('ru-RU')

// Подписи и единицы метрик. Без веса «сила» не показывается.
function metricMeta(metric: Metric, bodyweight: boolean) {
  if (metric === 'strength')
    return { label: 'Сила', unit: 'кг', hint: 'Рабочий (максимальный) вес в тренировке' }
  if (metric === 'reps')
    return bodyweight
      ? { label: 'Повторения', unit: 'повт.', hint: 'Максимум повторений в подходе' }
      : { label: 'Повторения', unit: 'повт.', hint: 'Повторения при рабочем весе' }
  return bodyweight
    ? { label: 'Объём', unit: 'повт.', hint: 'Сумма повторений за тренировку' }
    : { label: 'Объём', unit: 'кг', hint: 'Сумма вес × повторения. Рост объёма ≠ рост силы' }
}

export function ProgressExercisePage() {
  const { personId = '', exerciseKey = '' } = useParams()
  const navigate = useNavigate()
  const { completed } = useCompletedWorkoutsContext()
  const { catalog } = useExerciseCatalogContext()
  const [pickerOpen, setPickerOpen] = useState(false)

  const all = useMemo(
    () => buildProgress(completed.filter((c) => c.personId === personId), catalog),
    [completed, personId, catalog],
  )
  const progress = all.find((p) => p.key === exerciseKey)
  const back = () => navigate(`/person/${personId}/progress`)

  if (!progress) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader onBack={back} />
        <p className="mt-6 text-muted-foreground">Нет данных по этому упражнению.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <PageHeader onBack={back} />

      <button
        className="group -mx-1 flex items-center gap-2 rounded-xl px-1 text-left"
        onClick={() => setPickerOpen(true)}
        aria-label="Выбрать другое упражнение"
      >
        <h1 className="min-w-0 text-[30px] font-extrabold leading-tight tracking-tight sm:text-4xl">
          {progress.name}
        </h1>
        <ChevronsUpDown className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      </button>

      {/* key: при смене упражнения состояние вкладок и выбора сбрасывается */}
      <ExerciseDynamics key={progress.key} progress={progress} personId={personId} />

      <Drawer open={pickerOpen} onOpenChange={setPickerOpen}>
        <DrawerContent className="h-[70dvh]">
          <DrawerHeader>
            <DrawerTitle>Упражнение</DrawerTitle>
            <DrawerDescription>Только упражнения с выполненными подходами</DrawerDescription>
          </DrawerHeader>
          <ExerciseSwitcher
            items={all}
            selectedKey={progress.key}
            onPick={(key) => {
              setPickerOpen(false)
              navigate(`/person/${personId}/progress/${encodeURIComponent(key)}`, { replace: true })
            }}
          />
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function ExerciseDynamics({ progress: p, personId }: { progress: ExerciseProgress; personId: string }) {
  const metrics: Metric[] = p.bodyweight ? ['reps', 'volume'] : ['strength', 'reps', 'volume']
  const [metric, setMetric] = useState<Metric>(metrics[0])
  const [period, setPeriod] = useState<Period>('all')

  // Сеансы за выбранный период (индексы — в полном списке, для итогов «к прошлому»).
  const visible = useMemo(() => {
    const indexed = p.sessions.map((s, i) => ({ s, i }))
    if (period === 'all') return indexed
    const from = new Date()
    from.setDate(from.getDate() - Number(period))
    return indexed.filter(({ s }) => s.date >= dayKey(from))
  }, [p.sessions, period])

  const [sel, setSel] = useState(visible.length - 1)
  useEffect(() => {
    setSel(visible.length - 1)
  }, [visible.length, metric])

  const meta = metricMeta(metric, p.bodyweight)
  const values = visible.map(({ s }) => metricValue(s, metric, p.bodyweight))
  const best = Math.max(...p.sessions.map((s) => metricValue(s, metric, p.bodyweight)))
  const cur = visible[sel]

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={metric}
          onChange={setMetric}
          options={metrics.map((m) => ({ value: m, label: metricMeta(m, p.bodyweight).label }))}
        />
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: '30', label: '1 мес' },
            { value: '90', label: '3 мес' },
            { value: 'all', label: 'Всё' },
          ]}
        />
      </div>

      <Card className="flex flex-col gap-4 p-5">
        {visible.length === 0 || !cur ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            За этот период тренировок с упражнением не было
          </p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[34px] font-extrabold leading-none tracking-tight tabular-nums">
                  {n(values[sel])}
                  <span className="ml-1 text-base font-semibold text-muted-foreground">{meta.unit}</span>
                </div>
                <div className="mt-1.5 flex items-start gap-1 text-xs text-muted-foreground">
                  <Info className="mt-px size-3.5 shrink-0" /> <span>{meta.hint}</span>
                </div>
              </div>
              <VerdictBadge verdict={verdictFor(p, cur.i)} className="shrink-0" />
            </div>

            <LineChart
              points={visible.map(({ s }, i) => ({ date: s.date, value: values[i] }))}
              selected={sel}
              onSelect={setSel}
              highlight={(i) => values[i] === best && best > 0}
              formatValue={n}
              tooltip={(i) => {
                const prev = values[i - 1]
                const delta = prev === undefined ? null : values[i] - prev
                return (
                  <>
                    <div className="font-bold tabular-nums">
                      {n(values[i])} {meta.unit}
                      {delta !== null && delta !== 0 && (
                        <span className={delta > 0 ? 'ml-1.5 text-primary' : 'ml-1.5 text-destructive'}>
                          {delta > 0 ? '+' : '−'}
                          {n(Math.abs(delta))}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground">{formatDayKey(visible[i].s.date)}</div>
                  </>
                )
              }}
            />

            <div className="-mt-1 flex justify-between pl-12 text-[11px] tabular-nums text-muted-foreground">
              <span className="whitespace-nowrap">{formatDayKey(visible[0].s.date)}</span>
              <span className="whitespace-nowrap">{formatDayKey(visible[visible.length - 1].s.date)}</span>
            </div>
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground/80">
              <Hand className="size-3" /> Нажмите или проведите пальцем по графику
            </div>

            {/* Подходы выбранной тренировки */}
            <div className="border-t border-border/60 pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground first-letter:uppercase">
                  {formatDayKey(cur.s.date)} · подходы
                </span>
                {metric === 'strength' && cur.s.e1rm !== null && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    ≈1ПМ {n(cur.s.e1rm)} кг <span className="opacity-70">(оценка)</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cur.s.sets.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold tabular-nums"
                  >
                    {p.bodyweight ? `${s.reps} повт.` : `${n(s.weight)} × ${s.reps}`}
                  </span>
                ))}
              </div>
              <Link
                to={`/person/${personId}/completed/${cur.s.recordId}`}
                className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary"
              >
                Открыть тренировку <ChevronRight className="size-4" />
              </Link>
            </div>
          </>
        )}
      </Card>

      <Records progress={p} />
    </>
  )
}

function Records({ progress: p }: { progress: ExerciseProgress }) {
  const items = p.bodyweight
    ? [
        { label: 'Макс. повторений', value: `${p.best.reps}` },
        { label: 'Рекорд объёма', value: `${n(p.best.volume)} повт.` },
      ]
    : [
        { label: 'Рекорд веса', value: `${n(p.best.weight)} кг` },
        { label: '≈1ПМ (оценка)', value: p.best.e1rm !== null ? `${n(p.best.e1rm)} кг` : '—' },
        { label: 'Макс. повторений', value: `${p.best.reps}` },
        { label: 'Рекорд объёма', value: `${n(Math.round(p.best.volume))} кг` },
      ]
  return (
    <section className="flex flex-col gap-3">
      <h2 className="mt-2 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <Trophy className="size-3.5 text-amber-300" /> Рекорды
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((it) => (
          <Card key={it.label} className="p-4">
            <div className="text-xl font-extrabold tabular-nums">{it.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{it.label}</div>
          </Card>
        ))}
      </div>
    </section>
  )
}

function ExerciseSwitcher({
  items,
  selectedKey,
  onPick,
}: {
  items: ExerciseProgress[]
  selectedKey: string
  onPick: (key: string) => void
}) {
  const [query, setQuery] = useState('')
  const q = exerciseNameKey(query)
  const filtered = q ? items.filter((p) => exerciseNameKey(p.name).includes(q)) : items
  return (
    <Command shouldFilter={false} className="min-h-0 flex-1 px-5">
      <CommandInput value={query} onValueChange={setQuery} placeholder="Поиск упражнения" />
      <CommandList className="-mx-2 mt-2 min-h-0 flex-1 px-2 pb-4">
        <CommandEmpty>Ничего не найдено</CommandEmpty>
        {filtered.map((p) => (
          <CommandItem
            key={p.key}
            value={p.key}
            onSelect={() => onPick(p.key)}
            className={p.key === selectedKey ? 'text-primary' : undefined}
          >
            <span className="flex-1">{p.name}</span>
            <span className="text-xs text-muted-foreground">{p.sessions.length} трен.</span>
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  )
}
