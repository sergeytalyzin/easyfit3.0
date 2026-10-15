// Лёгкая анимация конфетти без сторонних зависимостей.
// Рисуется на временном canvas поверх интерфейса, не перехватывает клики
// (pointer-events: none) и сам удаляется по окончании (~1.4 c).

const COLORS = ['#B7F25B', '#E4FFB8', '#7FD13B', '#F5F7F8', '#88969F', '#FFC53D']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rot: number
  vr: number
  life: number
}

export function fireConfetti(): void {
  if (typeof window === 'undefined') return
  // Уважаем настройку «уменьшить движение».
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const W = window.innerWidth
  const H = window.innerHeight
  const dpr = window.devicePixelRatio || 1

  const canvas = document.createElement('canvas')
  canvas.width = W * dpr
  canvas.height = H * dpr
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }
  ctx.scale(dpr, dpr)

  const originX = W / 2
  const originY = H * 0.34
  const particles: Particle[] = Array.from({ length: 120 }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 6 + Math.random() * 7
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: 6 + Math.random() * 6,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 0,
    }
  })

  const gravity = 0.28
  const drag = 0.985
  const maxLife = 84 // кадров (~1.4 c при 60 fps)
  let frame = 0

  function tick() {
    frame++
    ctx!.clearRect(0, 0, W, H)
    for (const p of particles) {
      p.vx *= drag
      p.vy = p.vy * drag + gravity
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      p.life++
      ctx!.save()
      ctx!.globalAlpha = Math.max(0, 1 - p.life / maxLife)
      ctx!.translate(p.x, p.y)
      ctx!.rotate(p.rot)
      ctx!.fillStyle = p.color
      ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx!.restore()
    }
    if (frame < maxLife) {
      requestAnimationFrame(tick)
    } else {
      canvas.remove()
    }
  }
  requestAnimationFrame(tick)
}
