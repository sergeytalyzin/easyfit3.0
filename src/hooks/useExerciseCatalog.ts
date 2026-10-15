// Хук справочника упражнений: стандартные (константы) + собственные.
// Собственные автоматически сохраняются в localStorage.

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CatalogExercise, ExerciseCategory } from '../types'
import { EXERCISE_CATEGORIES, STANDARD_EXERCISES } from '../constants/exercises'
import { loadCustomExercises, saveCustomExercises } from '../utils/storage'
import { cleanExerciseName, exerciseNameKey } from '../utils/exercises'
import { uid } from '../utils/id'

const CATEGORY_IDS = new Set(EXERCISE_CATEGORIES.map((c) => c.id))

function loadValidCustom(): CatalogExercise[] {
  return loadCustomExercises()
    .filter((e) => e && typeof e.id === 'string' && typeof e.name === 'string')
    .map((e) => ({
      id: e.id,
      name: e.name,
      category: CATEGORY_IDS.has(e.category) ? e.category : 'other',
      custom: true,
    }))
}

// Результат добавления/редактирования: либо упражнение, либо текст ошибки.
type SaveResult = { ok: true; exercise: CatalogExercise } | { ok: false; error: string }

export function useExerciseCatalog() {
  const [custom, setCustom] = useState<CatalogExercise[]>(loadValidCustom)

  useEffect(() => {
    saveCustomExercises(custom)
  }, [custom])

  const catalog = useMemo(() => [...STANDARD_EXERCISES, ...custom], [custom])

  // Проверка названия: не пустое и без дублей во всём справочнике.
  const validate = useCallback(
    (name: string, excludeId?: string): string | null => {
      const key = exerciseNameKey(name)
      if (!key) return 'Введите название упражнения'
      const dup = catalog.find(
        (c) => c.id !== excludeId && exerciseNameKey(c.name) === key,
      )
      return dup ? `Упражнение «${dup.name}» уже есть в справочнике` : null
    },
    [catalog],
  )

  const addCustom = useCallback(
    (name: string, category: ExerciseCategory): SaveResult => {
      const error = validate(name)
      if (error) return { ok: false, error }
      const exercise: CatalogExercise = {
        id: `custom-${uid()}`,
        name: cleanExerciseName(name),
        category,
        custom: true,
      }
      setCustom((prev) => [...prev, exercise])
      return { ok: true, exercise }
    },
    [validate],
  )

  const updateCustom = useCallback(
    (id: string, name: string, category: ExerciseCategory): SaveResult => {
      const error = validate(name, id)
      if (error) return { ok: false, error }
      const exercise: CatalogExercise = {
        id,
        name: cleanExerciseName(name),
        category,
        custom: true,
      }
      setCustom((prev) => prev.map((e) => (e.id === id ? exercise : e)))
      return { ok: true, exercise }
    },
    [validate],
  )

  // Удаляет только из справочника: история тренировок хранит своё название.
  const removeCustom = useCallback((id: string) => {
    setCustom((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return { catalog, validate, addCustom, updateCustom, removeCustom }
}

export type ExerciseCatalogApi = ReturnType<typeof useExerciseCatalog>
