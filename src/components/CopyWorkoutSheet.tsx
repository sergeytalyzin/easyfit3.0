import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Badge } from '@/components/ui/badge'
import { Avatar } from './Avatar'
import type { Person } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  people: Person[]
  currentPersonId: string
  onPick: (personId: string) => void
}

// Выбор человека, которому копируем тренировку. Текущий владелец
// помечен, но копировать самому себе тоже можно (быстрый дубликат).
export function CopyWorkoutSheet({
  open,
  onClose,
  people,
  currentPersonId,
  onPick,
}: Props) {
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Скопировать тренировку</DrawerTitle>
          <DrawerDescription>Кому добавить копию шаблона</DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 pb-6">
          {people.map((p) => (
            <button
              key={p.id}
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-accent active:bg-accent"
              onClick={() => onPick(p.id)}
            >
              <Avatar name={p.name} avatar={p.avatar} size={44} />
              <span className="min-w-0 flex-1 truncate text-[17px] font-bold">{p.name}</span>
              {p.id === currentPersonId && <Badge variant="secondary">здесь же</Badge>}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
