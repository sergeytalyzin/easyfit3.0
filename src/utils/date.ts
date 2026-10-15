// Форматирование даты для отображения в карточках тренировок.
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })
}

// Ключ дня в формате YYYY-MM-DD по локальному времени.
// Используем для хранения и сравнения дат выполненных тренировок без
// проблем с часовыми поясами.
export function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// YYYY-MM-DD → Date (полночь по локальному времени).
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Понедельник недели, в которую попадает дата (полночь по локальному времени).
export function startOfWeek(d: Date): Date {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

// YYYY-MM-DD → «25 июня».
export function formatDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })
}

// YYYY-MM-DD → «среда, 25 июня 2026» — для заголовка выбранного дня.
export function formatDayKeyFull(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
