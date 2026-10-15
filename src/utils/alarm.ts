// Сигнал окончания отдыха: короткие гудки через Web Audio + вибрация.
// Звук браузеры разрешают только после действия пользователя — поэтому
// unlockAudio() вызываем по нажатию «Подход сделан».
// Ограничения: вибрации нет в iOS Safari; на iPhone звук может не играть
// в беззвучном режиме — главный сигнал визуальный (пульсация экрана).

let ctx: AudioContext | null = null

export function unlockAudio(): void {
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

// Три коротких гудка.
export function beep(): void {
  if (!ctx) return
  const t = ctx.currentTime
  for (const d of [0, 0.22, 0.44]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, t + d)
    gain.gain.exponentialRampToValueAtTime(0.35, t + d + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.16)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t + d)
    osc.stop(t + d + 0.18)
  }
}

export function vibrate(): void {
  navigator.vibrate?.([300, 150, 300])
}
