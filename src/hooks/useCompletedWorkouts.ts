// Хук с состоянием выполненных тренировок + операции.
// Хранится отдельно от шаблонов и автоматически пишется в localStorage.

import { useCallback, useEffect, useState } from 'react'
import type { CompletedWorkout, Exercise, RunSet, SetPlan, Workout, WorkoutSet } from '../types'
import { loadCompleted, saveCompleted } from '../utils/storage'
import {
  addExerciseTo,
  addSetTo,
  addSetsTo,
  removeExerciseFrom,
  removeSetFrom,
  renameExerciseIn,
  updateSetIn,
} from '../utils/workouts'
import { uid } from '../utils/id'
import { planOf } from '../utils/sets'
import { sameExercise } from '../utils/exercises'
import { lastResult } from '../utils/progress'

export function useCompletedWorkouts() {
  const [completed, setCompleted] = useState<CompletedWorkout[]>(() =>
    loadCompleted(),
  )

  useEffect(() => {
    saveCompleted(completed)
  }, [completed])

  // Отметить шаблон выполненным на дату (YYYY-MM-DD) — начать запись факта.
  // exerciseIds — какие упражнения реально сделаны (если не задано — все).
  // Каждый подход: снимок плана + факт, подставленный из прошлого результата
  // по этому упражнению (или нижняя граница плана), пока не отмеченный ✓.
  const completeTemplate = useCallback(
    (
      template: Workout,
      dayKeyValue: string,
      exerciseIds?: string[],
    ): CompletedWorkout => {
      const source = exerciseIds
        ? template.exercises.filter((e) => exerciseIds.includes(e.id))
        : template.exercises
      const record: CompletedWorkout = {
        id: uid(),
        personId: template.personId,
        templateId: template.id,
        name: template.name,
        date: dayKeyValue,
        createdAt: new Date().toISOString(),
        exercises: source.map((ex) => {
          const last = lastResult(
            completed.filter((r) => r.personId === template.personId),
            ex,
            dayKeyValue,
          )
          return {
            id: uid(),
            name: ex.name,
            catalogId: ex.catalogId,
            sets: ex.sets.map((s, i) => ({
              id: uid(),
              weight: last[i]?.weight ?? s.weight,
              reps: last[i]?.reps ?? s.reps,
              done: false,
              plan: planOf(s),
            })),
          }
        }),
      }
      setCompleted((prev) => [record, ...prev])
      return record
    },
    [completed],
  )

  // Сохранить результат экрана таймера: выполненные подходы упражнения
  // попадают в запись этого шаблона за день (создаётся, если её нет).
  // Возвращает id записи или null, если сохранять нечего.
  const saveRunResult = useCallback(
    (template: Workout, exercise: Exercise, sets: RunSet[], day: string): string | null => {
      const newSets: WorkoutSet[] = sets.flatMap((s, i) =>
        s.done
          ? [{
              id: uid(),
              weight: s.weight,
              reps: s.reps,
              done: true,
              plan: exercise.sets[i] ? planOf(exercise.sets[i]) : undefined,
            }]
          : [],
      )
      if (newSets.length === 0) return null

      const existing = completed.find(
        (r) => r.templateId === template.id && r.personId === template.personId && r.date === day,
      )
      const entry = () => ({ id: uid(), name: exercise.name, catalogId: exercise.catalogId, sets: newSets })

      if (!existing) {
        const record: CompletedWorkout = {
          id: uid(),
          personId: template.personId,
          templateId: template.id,
          name: template.name,
          date: day,
          createdAt: new Date().toISOString(),
          exercises: [entry()],
        }
        setCompleted((prev) => [record, ...prev])
        return record.id
      }

      setCompleted((prev) =>
        prev.map((r) => {
          if (r.id !== existing.id) return r
          const idx = r.exercises.findIndex((e) => sameExercise(e, exercise))
          if (idx < 0) return { ...r, exercises: [...r.exercises, entry()] }
          return {
            ...r,
            exercises: r.exercises.map((e, i) => {
              if (i !== idx) return e
              // Заготовка из «Отметить выполнение» без отметок — заменяем;
              // иначе дописываем, чтобы не потерять уже записанное.
              const keep = e.sets.every((x) => x.done === false) ? [] : e.sets
              return { ...e, sets: [...keep, ...newSets] }
            }),
          }
        }),
      )
      return existing.id
    },
    [completed],
  )

  const deleteCompleted = useCallback((id: string) => {
    setCompleted((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // Каскадное удаление при удалении человека.
  const deleteCompletedByPerson = useCallback((personId: string) => {
    setCompleted((prev) => prev.filter((c) => c.personId !== personId))
  }, [])

  // Хелпер: применить трансформацию упражнений к нужной записи.
  const patchExercises = useCallback(
    (
      id: string,
      fn: (exercises: CompletedWorkout['exercises']) => CompletedWorkout['exercises'],
    ) => {
      setCompleted((prev) =>
        prev.map((c) => (c.id === id ? { ...c, exercises: fn(c.exercises) } : c)),
      )
    },
    [],
  )

  const renameCompleted = useCallback((id: string, name: string) => {
    setCompleted((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
  }, [])

  const addExercise = useCallback(
    (id: string, name: string, catalogId?: string) =>
      patchExercises(id, (ex) => addExerciseTo(ex, name, uid, catalogId)),
    [patchExercises],
  )

  const updateExercise = useCallback(
    (id: string, exerciseId: string, name: string, catalogId?: string) =>
      patchExercises(id, (ex) => renameExerciseIn(ex, exerciseId, name, catalogId)),
    [patchExercises],
  )

  // Преобразование упражнений во всех записях — для синхронизации со справочником.
  const mapAllExercises = useCallback((fn: (e: Exercise) => Exercise) => {
    setCompleted((prev) =>
      prev.map((c) => ({ ...c, exercises: c.exercises.map(fn) })),
    )
  }, [])

  const deleteExercise = useCallback(
    (id: string, exerciseId: string) =>
      patchExercises(id, (ex) => removeExerciseFrom(ex, exerciseId)),
    [patchExercises],
  )

  const addSet = useCallback(
    (id: string, exerciseId: string) =>
      patchExercises(id, (ex) => addSetTo(ex, exerciseId, uid)),
    [patchExercises],
  )

  const addSets = useCallback(
    (id: string, exerciseId: string, count: number, plan: SetPlan) =>
      patchExercises(id, (ex) => addSetsTo(ex, exerciseId, count, plan, uid)),
    [patchExercises],
  )

  const updateSet = useCallback(
    (
      id: string,
      exerciseId: string,
      setId: string,
      patch: Partial<Omit<WorkoutSet, 'id'>>,
    ) => patchExercises(id, (ex) => updateSetIn(ex, exerciseId, setId, patch)),
    [patchExercises],
  )

  const deleteSet = useCallback(
    (id: string, exerciseId: string, setId: string) =>
      patchExercises(id, (ex) => removeSetFrom(ex, exerciseId, setId)),
    [patchExercises],
  )

  return {
    completed,
    completeTemplate,
    saveRunResult,
    deleteCompleted,
    deleteCompletedByPerson,
    renameCompleted,
    addExercise,
    updateExercise,
    deleteExercise,
    mapAllExercises,
    addSet,
    addSets,
    updateSet,
    deleteSet,
  }
}

export type CompletedWorkoutsApi = ReturnType<typeof useCompletedWorkouts>
