// Утилиты для аватарок.

// Несколько приятных iOS-подобных градиентов для fallback-аватара.
const GRADIENTS = [
  ['#FF9966', '#FF5E62'],
  ['#56CCF2', '#2F80ED'],
  ['#43E97B', '#38F9D7'],
  ['#A18CD1', '#FBC2EB'],
  ['#FBAB7E', '#F7CE68'],
  ['#5EE7DF', '#B490CA'],
  ['#667EEA', '#764BA2'],
  ['#F093FB', '#F5576C'],
]

// Стабильно выбираем градиент по имени, чтобы у человека он не менялся.
export function gradientFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  const [a, b] = GRADIENTS[hash % GRADIENTS.length]
  return `linear-gradient(135deg, ${a}, ${b})`
}

export function initialOf(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed[0].toUpperCase() : '?'
}

// Читает выбранный файл, уменьшает до квадрата maxSize и возвращает dataURL.
// Ресайз через canvas нужен, чтобы не забивать localStorage огромными фото.
export function fileToAvatarDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'))
      img.onload = () => {
        const size = Math.min(maxSize, Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas недоступен'))
          return
        }
        // Кадрируем по центру в квадрат.
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
