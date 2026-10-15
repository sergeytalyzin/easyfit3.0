// Одноразовое сообщение для следующего экрана (например, «Сохранено в прогресс»).
// Живёт в памяти: забирается один раз при показе.

export interface FlashMessage {
  text: string
  link?: { to: string; label: string }
}

let pending: FlashMessage | null = null

export function setFlash(message: FlashMessage): void {
  pending = message
}

export function takeFlash(): FlashMessage | null {
  const m = pending
  pending = null
  return m
}
