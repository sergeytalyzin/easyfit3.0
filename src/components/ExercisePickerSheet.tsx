import { useEffect, useMemo, useState } from 'react'
import { Check, Settings } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { useExerciseCatalogContext } from '@/hooks/ExerciseCatalogContext'
import { groupCatalog } from '@/utils/exercises'
import { cn } from '@/lib/utils'
import type { CatalogExercise } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  selectedId?: string
  onPick: (exercise: CatalogExercise) => void
}

// Выбор упражнения из справочника: поиск + группы по мышцам.
// Создать новое упражнение отсюда нельзя — только через настройки справочника.
export function ExercisePickerSheet({ open, onClose, selectedId, onPick }: Props) {
  const { catalog } = useExerciseCatalogContext()
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  // Фильтруем сами (регистр, пробелы, ё/е), а не нечётким поиском cmdk.
  const groups = useMemo(() => groupCatalog(catalog, query), [catalog, query])

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="h-[85dvh]">
        <DrawerHeader>
          <DrawerTitle>Упражнение</DrawerTitle>
          <DrawerDescription className="sr-only">
            Выберите упражнение из справочника
          </DrawerDescription>
        </DrawerHeader>

        <Command shouldFilter={false} className="min-h-0 flex-1 px-5">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Поиск упражнения"
            enterKeyHint="search"
          />
          <CommandList className="-mx-2 mt-2 min-h-0 flex-1 px-2 pb-4">
            <CommandEmpty>
              <span className="inline-flex flex-wrap items-center justify-center gap-1">
                Ничего не найдено. Своё упражнение можно добавить в настройках
                <Settings className="size-4" />
              </span>
            </CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g.label} heading={g.label}>
                {g.items.map((ex) => {
                  const active = ex.id === selectedId
                  return (
                    <CommandItem
                      key={ex.id}
                      value={ex.id}
                      onSelect={() => onPick(ex)}
                      className={cn(active && 'text-primary')}
                    >
                      <span className="flex-1">{ex.name}</span>
                      {ex.custom && <Badge>своё</Badge>}
                      {active && <Check className="text-primary" />}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DrawerContent>
    </Drawer>
  )
}
