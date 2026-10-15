import { useEffect } from 'react'

// Не даём экрану гаснуть, пока открыт экран таймера: иначе браузер
// остановит таймеры и сигнал не сработает. Тихо ничего не делает, если
// Wake Lock не поддерживается. После сворачивания браузер снимает блокировку —
// запрашиваем её снова при возврате.
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false

    async function request() {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock.release()
      } catch {
        lock = null
      }
    }
    function onVisible() {
      if (document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}
