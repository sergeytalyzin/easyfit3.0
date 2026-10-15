import type { ReactNode } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  subtitle: ReactNode
}

// Крупный редактируемый заголовок тренировки + подзаголовок (дата).
export function WorkoutHeading({ value, onChange, subtitle }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <input
        className="w-full bg-transparent text-[34px] font-extrabold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50 sm:text-5xl"
        value={value}
        placeholder="Название тренировки"
        aria-label="Название тренировки"
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground [&_svg]:size-4">
        {subtitle}
      </div>
    </div>
  )
}
