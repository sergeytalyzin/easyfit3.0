import type { Exercise, SetPlan, Workout, WorkoutSet } from '../types'
import { isEffectiveSet } from './sets'
import { parseDayKey, startOfWeek } from './date'

// Тренировки конкретного человека — единый фильтр по personId,
// чтобы данные разных людей не смешивались.
export function workoutsOf(workouts: Workout[], personId: string): Workout[] {
  return workouts.filter((w) => w.personId === personId)
}

// Последняя (самая свежая по дате) тренировка человека или null.
export function lastWorkoutOf(
  workouts: Workout[],
  personId: string,
): Workout | null {
  return workoutsOf(workouts, personId).reduce<Workout | null>(
    (latest, w) => (!latest || w.date > latest.date ? w : latest),
    null,
  )
}

// Название тренировки с подстановкой для пустого.
export function workoutTitle(w: Workout): string {
  return w.name.trim() || 'Без названия'
}

// Тоннаж: сумма вес × повторения по выполненным подходам.
export function exercisesVolume(exercises: Exercise[]): number {
  return exercises.reduce(
    (sum, e) =>
      sum + e.sets.filter(isEffectiveSet).reduce((s, set) => s + set.weight * set.reps, 0),
    0,
  )
}

// Серия недель подряд (пн–вс) хотя бы с одной тренировкой. Текущая неделя
// без тренировки серию не обрывает — она ещё не закончилась.
export function weekStreak(dayKeys: string[], today: Date): number {
  const weeks = new Set(dayKeys.map((k) => startOfWeek(parseDayKey(k)).getTime()))
  const cursor = startOfWeek(today)
  if (!weeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7)
  let streak = 0
  while (weeks.has(cursor.getTime())) {
    streak++
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

// Глубокая копия подходов с новыми id — для дублирования тренировки.
// Копируются план и диапазоны; отметки факта (done/plan) — нет.
export function cloneSets(sets: WorkoutSet[], makeId: () => string): WorkoutSet[] {
  return sets.map((s) => ({
    id: makeId(),
    weight: s.weight,
    reps: s.reps,
    weightMax: s.weightMax,
    repsMax: s.repsMax,
  }))
}

// --- Чистые иммутабельные операции над списком упражнений ---
// Вынесены отдельно, чтобы их могли переиспользовать разные хранилища
// (шаблоны и выполненные тренировки) без дублирования логики.

export function addExerciseTo(
  exercises: Exercise[],
  name: string,
  makeId: () => string,
  catalogId?: string,
): Exercise[] {
  return [...exercises, { id: makeId(), name: name.trim(), catalogId, sets: [] }]
}

export function renameExerciseIn(
  exercises: Exercise[],
  exerciseId: string,
  name: string,
  catalogId?: string,
): Exercise[] {
  return exercises.map((e) =>
    e.id === exerciseId ? { ...e, name, catalogId } : e,
  )
}

export function removeExerciseFrom(
  exercises: Exercise[],
  exerciseId: string,
): Exercise[] {
  return exercises.filter((e) => e.id !== exerciseId)
}

export function addSetTo(
  exercises: Exercise[],
  exerciseId: string,
  makeId: () => string,
): Exercise[] {
  return exercises.map((e) => {
    if (e.id !== exerciseId) return e
    return { ...e, sets: [...e.sets, nextSet(e.sets, makeId)] }
  })
}

// Новый подход наследует значения предыдущего — меньше ввода. В выполненной
// тренировке с отметками новый подход ещё не отмечен выполненным.
export function nextSet(sets: WorkoutSet[], makeId: () => string): WorkoutSet {
  const last = sets[sets.length - 1]
  return {
    id: makeId(),
    weight: last ? last.weight : 0,
    reps: last ? last.reps : 0,
    weightMax: last?.weightMax,
    repsMax: last?.repsMax,
    done: last?.done === undefined ? undefined : false,
  }
}

// Сразу несколько одинаковых подходов: «3 × 8–12 по 60 кг».
export function addSetsTo(
  exercises: Exercise[],
  exerciseId: string,
  count: number,
  plan: SetPlan,
  makeId: () => string,
): Exercise[] {
  return exercises.map((e) =>
    e.id === exerciseId
      ? {
          ...e,
          sets: [
            ...e.sets,
            ...Array.from({ length: count }, () => ({ id: makeId(), ...plan })),
          ],
        }
      : e,
  )
}

export function updateSetIn(
  exercises: Exercise[],
  exerciseId: string,
  setId: string,
  patch: Partial<Omit<WorkoutSet, 'id'>>,
): Exercise[] {
  return exercises.map((e) =>
    e.id === exerciseId
      ? {
          ...e,
          sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
        }
      : e,
  )
}

export function removeSetFrom(
  exercises: Exercise[],
  exerciseId: string,
  setId: string,
): Exercise[] {
  return exercises.map((e) =>
    e.id === exerciseId
      ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
      : e,
  )
}
