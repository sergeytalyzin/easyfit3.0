import { gradientFor, initialOf } from '@/utils/avatar'
import { cn } from '@/lib/utils'

interface Props {
  name: string
  avatar?: string | null
  size?: number
  className?: string
}

export function Avatar({ name, avatar, size = 52, className }: Props) {
  return (
    <div
      className={cn(
        'flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-bold text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.6)]',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: avatar ? undefined : gradientFor(name),
      }}
    >
      {avatar ? (
        <img src={avatar} alt={name} className="block size-full object-cover" />
      ) : (
        <span className="leading-none [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]">
          {initialOf(name)}
        </span>
      )}
    </div>
  )
}
