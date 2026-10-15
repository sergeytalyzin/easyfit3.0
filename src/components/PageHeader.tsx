import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  onBack: () => void
  right?: ReactNode // действия справа, на одной линии с «Назад»
}

// Верхняя строка экрана: «Назад» слева, действия справа.
export function PageHeader({ onBack, right }: Props) {
  return (
    <div className="mt-2 flex items-center justify-between">
      <Button variant="ghost" className="-ml-3 gap-1 px-3 text-base" onClick={onBack}>
        <ChevronLeft className="!size-5" />
        Назад
      </Button>
      {right && <div className="flex items-center gap-1">{right}</div>}
    </div>
  )
}
