// Вся логика сохранения людей и тренировок в localStorage собрана здесь.
// Это единственное место, которое знает про localStorage — поэтому
// в будущем легко заменить хранилище (IndexedDB, экспорт/импорт, облако).

import type { CatalogExercise, CompletedWorkout, Person, RunState, Workout } from '../types'
import { uid } from './id'

const WORKOUTS_KEY = 'gym-tracker:workouts'
const COMPLETED_KEY = 'gym-tracker:completed'
const PEOPLE_KEY = 'gym-tracker:people'
const FAVORITE_KEY = 'gym-tracker:favorite'
const CUSTOM_EXERCISES_KEY = 'gym-tracker:custom-exercises'
const REST_KEY = 'gym-tracker:rest-sec'
const RUN_KEY = 'gym-tracker:run'
// Версия схемы данных. Пригодится для будущих миграций при изменении формата.
const SCHEMA_VERSION = 2

interface StoredWorkouts {
  version: number
  workouts: Workout[]
}

interface StoredPeople {
  version: number
  people: Person[]
}

interface StoredCompleted {
  version: number
  completed: CompletedWorkout[]
}

function readWorkoutsRaw(): Workout[] {
  try {
    const raw = localStorage.getItem(WORKOUTS_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as StoredWorkouts
    return Array.isArray(data?.workouts) ? data.workouts : []
  } catch (e) {
    console.error('Не удалось загрузить тренировки:', e)
    return []
  }
}

function readPeopleRaw(): Person[] {
  try {
    const raw = localStorage.getItem(PEOPLE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as StoredPeople
    return Array.isArray(data?.people) ? data.people : []
  } catch (e) {
    console.error('Не удалось загрузить людей:', e)
    return []
  }
}

// --- Миграция ---
// Безопасно приводит старые данные к схеме v2: если есть тренировки без
// personId, создаём дефолтного человека «Я» и привязываем их к нему.
// Функция идемпотентна — повторный вызов ничего не портит.
let migrationDone = false
function runMigration(): void {
  if (migrationDone) return
  migrationDone = true

  const workouts = readWorkoutsRaw()
  const people = readPeopleRaw()

  const orphans = workouts.filter((w) => !w.personId)
  if (orphans.length === 0) return // всё уже привязано — миграция не нужна

  let defaultPerson = people[0]
  if (!defaultPerson) {
    defaultPerson = {
      id: uid(),
      name: 'Я',
      avatar: null,
      createdAt: new Date().toISOString(),
    }
    people.push(defaultPerson)
  }

  for (const w of orphans) w.personId = defaultPerson.id

  savePeople(people)
  saveWorkouts(workouts)
}

// --- Публичное API ---

export function loadWorkouts(): Workout[] {
  runMigration()
  return readWorkoutsRaw()
}

export function saveWorkouts(workouts: Workout[]): void {
  try {
    const data: StoredWorkouts = { version: SCHEMA_VERSION, workouts }
    localStorage.setItem(WORKOUTS_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Не удалось сохранить тренировки:', e)
  }
}

export function loadPeople(): Person[] {
  runMigration()
  return readPeopleRaw()
}

export function savePeople(people: Person[]): void {
  try {
    const data: StoredPeople = { version: SCHEMA_VERSION, people }
    localStorage.setItem(PEOPLE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Не удалось сохранить людей:', e)
  }
}

// --- Выполненные тренировки ---
// Отдельное хранилище от шаблонов: ключ свой, изначально пустой.
// Существующие данные пользователей не затрагиваются.

export function loadCompleted(): CompletedWorkout[] {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as StoredCompleted
    return Array.isArray(data?.completed) ? data.completed : []
  } catch (e) {
    console.error('Не удалось загрузить выполненные тренировки:', e)
    return []
  }
}

export function saveCompleted(completed: CompletedWorkout[]): void {
  try {
    const data: StoredCompleted = { version: SCHEMA_VERSION, completed }
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Не удалось сохранить выполненные тренировки:', e)
  }
}

// --- Фаворитный (основной) человек ---
// Храним просто id выбранного человека, отдельным ключом.

export function loadFavorite(): string | null {
  try {
    return localStorage.getItem(FAVORITE_KEY) || null
  } catch {
    return null
  }
}

export function saveFavorite(personId: string | null): void {
  try {
    if (personId) localStorage.setItem(FAVORITE_KEY, personId)
    else localStorage.removeItem(FAVORITE_KEY)
  } catch (e) {
    console.error('Не удалось сохранить основного человека:', e)
  }
}

// --- Собственные упражнения справочника ---
// Стандартные упражнения — константы во frontend, здесь только пользовательские.

interface StoredCustomExercises {
  version: number
  exercises: CatalogExercise[]
}

export function loadCustomExercises(): CatalogExercise[] {
  try {
    const raw = localStorage.getItem(CUSTOM_EXERCISES_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as StoredCustomExercises
    return Array.isArray(data?.exercises) ? data.exercises : []
  } catch (e) {
    console.error('Не удалось загрузить упражнения:', e)
    return []
  }
}

export function saveCustomExercises(exercises: CatalogExercise[]): void {
  try {
    const data: StoredCustomExercises = { version: SCHEMA_VERSION, exercises }
    localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Не удалось сохранить упражнения:', e)
  }
}

// --- Таймер отдыха ---
// Общее время отдыха и состояние открытого экрана выполнения (чтобы
// перезагрузка или сворачивание не сбрасывали таймер).

export const DEFAULT_REST_SEC = 120

export function loadRestSec(): number {
  try {
    const v = Number(localStorage.getItem(REST_KEY))
    return v > 0 ? v : DEFAULT_REST_SEC
  } catch {
    return DEFAULT_REST_SEC
  }
}

export function saveRestSec(sec: number): void {
  try {
    localStorage.setItem(REST_KEY, String(sec))
  } catch (e) {
    console.error('Не удалось сохранить время отдыха:', e)
  }
}

export function loadRun(): RunState | null {
  try {
    const raw = localStorage.getItem(RUN_KEY)
    return raw ? (JSON.parse(raw) as RunState) : null
  } catch {
    return null
  }
}

export function saveRun(state: RunState | null): void {
  try {
    if (state) localStorage.setItem(RUN_KEY, JSON.stringify(state))
    else localStorage.removeItem(RUN_KEY)
  } catch (e) {
    console.error('Не удалось сохранить таймер:', e)
  }
}

// Удобно для будущего экспорта данных.
export function exportData(): string {
  return JSON.stringify(
    {
      version: SCHEMA_VERSION,
      people: loadPeople(),
      workouts: loadWorkouts(),
      completed: loadCompleted(),
      customExercises: loadCustomExercises(),
    },
    null,
    2,
  )
}
