// Расчёт прогресса по упражнениям из выполненных тренировок.
// Сила, повторения и объём — отдельные метрики: рост объёма не выдаём за рост силы.

import type { CatalogExercise, CompletedWorkout, Exercise, WorkoutSet } from '../types'
import { exerciseNameKey, findCatalogEntry, sameExercise } from './exercises'
import { isEffectiveSet } from './sets'

export type Metric = 'strength' | 'reps' | 'volume'

// Одна тренировка по упражнению (несколько вхождений за день объединены).
export interface SessionMetrics {
  date: string // YYYY-MM-DD
  recordId: string // последняя запись этого дня с упражнением
  sets: { weight: number; reps: number }[] // только реально выполненные подходы
  topWeight: number // рабочий (максимальный) вес
  topReps: number // лучшие повторения при рабочем весе
  maxReps: number // максимум повторений в подходе
  totalReps: number
  volume: number // Σ вес × повторения, кг
  e1rm: number | null // расчётный максимум на 1 повторение (Эпли), только до 12 повт.
}

export interface ExerciseProgress {
  key: string // стабильный ключ: id справочника или нормализованное название
  name: string
  bodyweight: boolean // упражнение без веса — прогресс по повторениям
  sessions: SessionMetrics[] // старые → новые
  best: { weight: number; reps: number; volume: number; e1rm: number | null }
}

export type VerdictKind = 'first' | 'pr' | 'up' | 'volume' | 'same' | 'down'
export interface Verdict {
  kind: VerdictKind
  text: string
}

// Формула Эпли. Для больших повторений оценка ненадёжна — не считаем.
export function estimate1RM(weight: number, reps: number): number | null {
  if (weight <= 0 || reps < 1 || reps > 12) return null
  const value = reps === 1 ? weight : weight * (1 + reps / 30)
  return Math.round(value * 2) / 2 // до 0,5 кг
}

export function exerciseKeyOf(
  catalog: CatalogExercise[],
  ex: Pick<Exercise, 'name' | 'catalogId'>,
): string {
  const entry = findCatalogEntry(catalog, ex)
  return entry ? entry.id : `name:${exerciseNameKey(ex.name)}`
}

export function buildProgress(
  records: CompletedWorkout[],
  catalog: CatalogExercise[],
): ExerciseProgress[] {
  const sorted = [...records].sort((a, b) =>
    a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date),
  )

  // key → { name, date → накопленные подходы }
  const groups = new Map<
    string,
    { name: string; days: Map<string, { recordId: string; sets: SessionMetrics['sets'] }> }
  >()

  for (const rec of sorted) {
    for (const ex of rec.exercises) {
      if (!exerciseNameKey(ex.name)) continue
      const sets = ex.sets.filter(isEffectiveSet).map((s) => ({ weight: s.weight, reps: s.reps }))
      if (sets.length === 0) continue

      const key = exerciseKeyOf(catalog, ex)
      const entry = findCatalogEntry(catalog, ex)
      let g = groups.get(key)
      if (!g) {
        g = { name: '', days: new Map() }
        groups.set(key, g)
      }
      g.name = entry?.name ?? ex.name.trim() // актуальное название
      const day = g.days.get(rec.date)
      if (day) {
        day.sets.push(...sets)
        day.recordId = rec.id
      } else {
        g.days.set(rec.date, { recordId: rec.id, sets })
      }
    }
  }

  const result: ExerciseProgress[] = []
  for (const [key, g] of groups) {
    const sessions = [...g.days.entries()].map(([date, d]) => metricsOf(date, d.recordId, d.sets))
    const bodyweight = sessions.every((s) => s.topWeight === 0)
    const e1rms = sessions.map((s) => s.e1rm).filter((v): v is number => v !== null)
    result.push({
      key,
      name: g.name,
      bodyweight,
      sessions,
      best: {
        weight: Math.max(...sessions.map((s) => s.topWeight)),
        reps: Math.max(...sessions.map((s) => s.maxReps)),
        volume: Math.max(...sessions.map((s) => metricValue(s, 'volume', bodyweight))),
        e1rm: e1rms.length ? Math.max(...e1rms) : null,
      },
    })
  }

  // Упражнения с самой свежей тренировкой — выше.
  result.sort((a, b) =>
    b.sessions[b.sessions.length - 1].date.localeCompare(a.sessions[a.sessions.length - 1].date),
  )
  return result
}

function metricsOf(date: string, recordId: string, sets: SessionMetrics['sets']): SessionMetrics {
  const topWeight = Math.max(...sets.map((s) => s.weight))
  const e1rms = sets.map((s) => estimate1RM(s.weight, s.reps)).filter((v): v is number => v !== null)
  return {
    date,
    recordId,
    sets,
    topWeight,
    topReps: Math.max(...sets.filter((s) => s.weight === topWeight).map((s) => s.reps)),
    maxReps: Math.max(...sets.map((s) => s.reps)),
    totalReps: sets.reduce((n, s) => n + s.reps, 0),
    volume: sets.reduce((n, s) => n + s.weight * s.reps, 0),
    e1rm: e1rms.length ? Math.max(...e1rms) : null,
  }
}

// Значение метрики для графика. Без веса: «сила» не имеет смысла,
// повторения — максимум в подходе, объём — сумма повторений.
export function metricValue(s: SessionMetrics, metric: Metric, bodyweight: boolean): number {
  if (metric === 'strength') return s.topWeight
  if (metric === 'reps') return bodyweight ? s.maxReps : s.topReps
  return bodyweight ? s.totalReps : s.volume
}

const kg = (n: number) => `${n.toLocaleString('ru-RU')} кг`
const pct = (cur: number, prev: number) => Math.round(((cur - prev) / prev) * 100)

// Что изменилось в тренировке index по сравнению с прошлыми.
// Приоритет: рекорд → рост силы/повторений → снижение → только объём.
export function verdictFor(p: ExerciseProgress, index: number): Verdict {
  const cur = p.sessions[index]
  if (index === 0) return { kind: 'first', text: 'Первая тренировка' }
  const prev = p.sessions[index - 1]
  const before = p.sessions.slice(0, index)

  if (p.bodyweight) {
    const bestReps = Math.max(...before.map((s) => s.maxReps))
    if (cur.maxReps > bestReps) return { kind: 'pr', text: `Рекорд: ${cur.maxReps} повт.` }
    if (cur.maxReps > prev.maxReps) return { kind: 'up', text: `+${cur.maxReps - prev.maxReps} повт.` }
    if (cur.maxReps < prev.maxReps) return { kind: 'down', text: `−${prev.maxReps - cur.maxReps} повт.` }
    if (cur.totalReps > prev.totalReps)
      return { kind: 'volume', text: `Всего повторений +${cur.totalReps - prev.totalReps}` }
    return { kind: 'same', text: 'Без изменений' }
  }

  const bestWeight = Math.max(...before.map((s) => s.topWeight))
  if (cur.topWeight > bestWeight) return { kind: 'pr', text: `Рекорд веса: ${kg(cur.topWeight)}` }
  if (cur.topWeight > prev.topWeight)
    return { kind: 'up', text: `+${kg(cur.topWeight - prev.topWeight)} к рабочему весу` }

  // Повторения сравниваем с последней тренировкой с тем же рабочим весом.
  const sameWeight = [...before].reverse().find((s) => s.topWeight === cur.topWeight)
  if (sameWeight && cur.topReps > sameWeight.topReps)
    return { kind: 'up', text: `+${cur.topReps - sameWeight.topReps} повт. при ${kg(cur.topWeight)}` }
  if (cur.topWeight < prev.topWeight)
    return { kind: 'down', text: `−${kg(prev.topWeight - cur.topWeight)} к рабочему весу` }
  if (sameWeight && cur.topReps < sameWeight.topReps)
    return { kind: 'down', text: `−${sameWeight.topReps - cur.topReps} повт. при ${kg(cur.topWeight)}` }

  if (prev.volume > 0 && cur.volume !== prev.volume) {
    const d = pct(cur.volume, prev.volume)
    if (d !== 0) return { kind: d > 0 ? 'volume' : 'same', text: `Объём ${d > 0 ? '+' : '−'}${Math.abs(d)}%` }
  }
  return { kind: 'same', text: 'Без изменений' }
}

// Выполненные подходы упражнения из последней записи не позже даты day —
// чтобы подставить «как в прошлый раз».
export function lastResult(
  records: CompletedWorkout[],
  exercise: Pick<Exercise, 'name' | 'catalogId'>,
  day: string,
): WorkoutSet[] {
  const sorted = records
    .filter((r) => r.date <= day)
    .sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
    )
  for (const r of sorted) {
    const sets = r.exercises
      .filter((e) => sameExercise(e, exercise))
      .flatMap((e) => e.sets.filter(isEffectiveSet))
    if (sets.length) return sets
  }
  return []
}
