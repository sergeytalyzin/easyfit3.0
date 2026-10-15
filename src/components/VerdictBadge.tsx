import { Minus, TrendingDown, TrendingUp, Trophy, Sparkles, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Verdict } from '@/utils/progress'

// Итог тренировки по упражнению: рекорд / рост / только объём / без изменений / снижение.
export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const style = {
    pr: { icon: Trophy, cls: 'bg-amber-400/15 text-amber-300' },
    up: { icon: TrendingUp, cls: 'bg-primary/15 text-primary' },
    volume: { icon: Layers, cls: 'bg-sky-400/15 text-sky-300' },
    same: { icon: Minus, cls: 'bg-secondary text-muted-foreground' },
    down: { icon: TrendingDown, cls: 'bg-destructive/15 text-destructive' },
    first: { icon: Sparkles, cls: 'bg-secondary text-muted-foreground' },
  }[verdict.kind]
  const Icon = style.icon
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        style.cls,
        className,
      )}
    >
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{verdict.text}</span>
    </span>
  )
}
