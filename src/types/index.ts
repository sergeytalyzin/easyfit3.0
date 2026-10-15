// Доменные типы приложения. Вынесены отдельно, чтобы их было удобно
// расширять в будущем (история, шаблоны, экспорт и т.д.).

export interface Person {
  id: string
  name: string
  avatar?: string | null // dataURL картинки или null (тогда показываем букву)
  createdAt: string // ISO-строка
}

// План подхода: точное значение или диапазон (min = weight/reps, max — необязателен).
export interface SetPlan {
  weight: number
  weightMax?: number
  reps: number
  repsMax?: number
}

// Подход. В шаблоне weight/reps — план (точно или нижняя граница диапазона).
// В выполненной тренировке weight/reps — факт, plan — снимок плана.
// Все дополнительные поля необязательны: старые данные остаются валидными.
export interface WorkoutSet {
  id: string
  weight: number // вес в кг
  reps: number // количество повторений
  weightMax?: number // только шаблон: верх диапазона веса
  repsMax?: number // только шаблон: верх диапазона повторений
  done?: boolean // только факт: подход выполнен; нет поля (старые записи) — считаем выполненным
  plan?: SetPlan // только факт: что было запланировано
}

export interface Exercise {
  id: string
  // Снимок названия: по нему строится история и статистика. Остаётся даже
  // если упражнение удалено из справочника.
  name: string
  // Ссылка на упражнение справочника. Нет у старых записей (до справочника).
  catalogId?: string
  sets: WorkoutSet[]
}

export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'forearms'
  | 'traps'
  | 'cardio'
  | 'other'

// Упражнение справочника: стандартное (константа) или собственное (custom).
export interface CatalogExercise {
  id: string
  name: string
  category: ExerciseCategory
  custom?: boolean
}

export interface Workout {
  id: string
  personId: string // к какому человеку относится тренировка
  name: string
  date: string // ISO-строка даты создания
  exercises: Exercise[]
}

// Выполненная тренировка — снимок шаблона на конкретную дату.
// Хранится отдельно от шаблонов: редактируется независимо и не меняет шаблон.
export interface CompletedWorkout {
  id: string
  personId: string
  templateId: string | null // шаблон-источник (если был); null если шаблон удалён
  name: string
  date: string // день выполнения в формате YYYY-MM-DD
  createdAt: string // ISO-строка момента отметки
  exercises: Exercise[] // копия упражнений шаблона на момент отметки
}

// Режим выполнения упражнения с таймером отдыха (живёт до закрытия экрана).
export interface RunSet {
  weight: number
  reps: number
  done: boolean
}

export interface RunState {
  workoutId: string
  exerciseId: string
  day: string // YYYY-MM-DD — в какую дату сохранять результат
  sets: RunSet[]
  current: number // индекс текущего подхода
  phase: 'set' | 'rest' | 'alarm' | 'finished'
  restEndsAt: number | null // момент окончания отдыха (ms) — переживает сворачивание
  restTotal: number // длительность текущего отдыха, сек
}
