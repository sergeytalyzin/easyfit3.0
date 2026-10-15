import { EXERCISE_CATEGORIES } from '../constants/exercises'
import type { CatalogExercise, Exercise } from '../types'

// Убирает пробелы по краям и схлопывает повторяющиеся — так название и храним.
export function cleanExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

// Ключ для сравнения названий: без учёта регистра, лишних пробелов и ё/е.
export function exerciseNameKey(name: string): string {
  return cleanExerciseName(name).toLowerCase().replace(/ё/g, 'е')
}

// Упражнение справочника для упражнения тренировки: по ссылке, а для старых
// записей без ссылки — по точному (нормализованному) совпадению названия.
export function findCatalogEntry(
  catalog: CatalogExercise[],
  exercise: Pick<Exercise, 'name' | 'catalogId'>,
): CatalogExercise | undefined {
  if (exercise.catalogId) {
    const byId = catalog.find((c) => c.id === exercise.catalogId)
    if (byId) return byId
  }
  const key = exerciseNameKey(exercise.name)
  return key ? catalog.find((c) => exerciseNameKey(c.name) === key) : undefined
}

// Одно ли это упражнение: по ссылке на справочник или по названию.
export function sameExercise(
  a: Pick<Exercise, 'name' | 'catalogId'>,
  b: Pick<Exercise, 'name' | 'catalogId'>,
): boolean {
  if (a.catalogId && a.catalogId === b.catalogId) return true
  const key = exerciseNameKey(a.name)
  return key !== '' && key === exerciseNameKey(b.name)
}

// Фильтр по подстроке названия (без учёта регистра) + группировка по
// мышечным группам в порядке EXERCISE_CATEGORIES. Пустые группы опускаются.
export function groupCatalog(
  catalog: CatalogExercise[],
  query: string,
): { label: string; items: CatalogExercise[] }[] {
  const q = exerciseNameKey(query)
  const filtered = q
    ? catalog.filter((c) => exerciseNameKey(c.name).includes(q))
    : catalog
  return EXERCISE_CATEGORIES.map((cat) => ({
    label: cat.label,
    items: filtered.filter((c) => c.category === cat.id),
  })).filter((g) => g.items.length > 0)
}
