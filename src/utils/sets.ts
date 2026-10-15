import type { SetPlan, WorkoutSet } from '../types'

// Подход учитывается в статистике, если в нём есть повторения и он не
// помечен как невыполненный (у старых записей отметки нет — считаем выполненным).
export function isEffectiveSet(s: WorkoutSet): boolean {
  return s.reps > 0 && s.done !== false
}

const num = (n: number) => n.toLocaleString('ru-RU')

// «8–12» для диапазона, «10» для точного значения.
export function formatRange(min: number, max?: number): string {
  return max !== undefined && max > min ? `${num(min)}–${num(max)}` : num(min)
}

// «60–70 кг × 8–12» — краткая запись плана подхода.
export function formatPlan(p: SetPlan): string {
  return `${formatRange(p.weight, p.weightMax)} кг × ${formatRange(p.reps, p.repsMax)}`
}

export function planOf(s: WorkoutSet): SetPlan {
  return { weight: s.weight, weightMax: s.weightMax, reps: s.reps, repsMax: s.repsMax }
}

// Одинаковый ли план у всех подходов (для краткой сводки «3 × 8–12»).
export function samePlan(a: SetPlan, b: SetPlan): boolean {
  return (
    a.weight === b.weight &&
    a.weightMax === b.weightMax &&
    a.reps === b.reps &&
    a.repsMax === b.repsMax
  )
}

// Подряд идущие одинаковые подходы: [80×8, 80×8, 70×10] → 2 × 8 · 80 кг, 1 × 10 · 70 кг.
export interface SetGroup {
  count: number
  plan: SetPlan
}

export function groupSets(sets: WorkoutSet[]): SetGroup[] {
  const groups: SetGroup[] = []
  for (const s of sets) {
    const plan = planOf(s)
    const last = groups[groups.length - 1]
    if (last && samePlan(last.plan, plan)) last.count++
    else groups.push({ count: 1, plan })
  }
  return groups
}

// «6 × 10 · 20 кг»; без веса (собственный вес) — «3 × 8–12».
export function formatSetGroup({ count, plan }: SetGroup): string {
  const reps = `${count} × ${formatRange(plan.reps, plan.repsMax)}`
  return plan.weight > 0 || plan.weightMax !== undefined
    ? `${reps} · ${formatRange(plan.weight, plan.weightMax)} кг`
    : reps
}

// Краткая сводка плана: до maxGroups строк, остальное — «ещё N подх.».
export function summarizeSets(
  sets: WorkoutSet[],
  maxGroups = 2,
): { lines: string[]; moreSets: number } {
  const groups = groupSets(sets)
  const shown = groups.slice(0, maxGroups)
  return {
    lines: shown.map(formatSetGroup),
    moreSets: groups.slice(maxGroups).reduce((n, g) => n + g.count, 0),
  }
}
