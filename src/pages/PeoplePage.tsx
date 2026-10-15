import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Dumbbell, Star, UserPlus, Users } from 'lucide-react'
import { usePeopleContext } from '@/hooks/PeopleContext'
import { useWorkoutsContext } from '@/hooks/WorkoutsContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/Avatar'
import { AddPersonSheet } from '@/components/AddPersonSheet'
import { formatDate } from '@/utils/date'
import { lastWorkoutOf, workoutsOf, workoutTitle } from '@/utils/workouts'
import { cn } from '@/lib/utils'

export function PeoplePage() {
  const { people, favoriteId, createPerson, toggleFavorite } = usePeopleContext()
  const { workouts } = useWorkoutsContext()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)

  function onCreate(name: string, avatar: string | null) {
    const person = createPerson(name, avatar)
    setSheetOpen(false)
    navigate(`/person/${person.id}`)
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <header className="mt-4 flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          <Dumbbell className="size-4" /> EasyFit
        </span>
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight sm:text-5xl">Люди</h1>
        <p className="text-sm font-medium text-muted-foreground">Чьи тренировки ведём</p>
      </header>

      <Button size="lg" className="w-full" onClick={() => setSheetOpen(true)}>
        <UserPlus /> Добавить человека
      </Button>

      {people.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Users className="size-7" />
          </span>
          <p className="text-lg font-bold">Добавьте первого человека</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Себя, друга или клиента — у каждого свои шаблоны и прогресс.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {people.map((p, i) => {
            const own = workoutsOf(workouts, p.id)
            const last = lastWorkoutOf(workouts, p.id)
            const isFavorite = favoriteId === p.id
            return (
              <Card
                key={p.id}
                role="link"
                tabIndex={0}
                className="flex cursor-pointer items-center gap-4 p-4 pr-2 transition-colors animate-in fade-in slide-in-from-bottom-2 fill-mode-both hover:bg-accent/40 active:scale-[0.99]"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                onClick={() => navigate(`/person/${p.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/person/${p.id}`)}
              >
                <Avatar
                  name={p.name}
                  avatar={p.avatar}
                  size={54}
                  className={cn(isFavorite && 'ring-2 ring-primary ring-offset-2 ring-offset-card')}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[17px] font-bold">{p.name}</span>
                    {isFavorite && <Badge>Основной</Badge>}
                  </div>
                  {own.length === 0 ? (
                    <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                      Тренировок пока нет
                    </div>
                  ) : (
                    <>
                      {last && (
                        <div className="mt-0.5 truncate text-sm text-foreground/80">
                          Последняя: {workoutTitle(last)}
                        </div>
                      )}
                      <div className="mt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                        {own.length} {pluralWorkouts(own.length)}
                        {last ? ` · ${formatDate(last.date)}` : ''}
                      </div>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('shrink-0', isFavorite ? 'text-primary' : 'text-muted-foreground')}
                  aria-label={isFavorite ? 'Снять основного' : 'Сделать основным'}
                  aria-pressed={isFavorite}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(p.id)
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Star className={cn(isFavorite && 'fill-current')} />
                </Button>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </Card>
            )
          })}
        </div>
      )}

      <AddPersonSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onCreate={onCreate} />
    </div>
  )
}

function pluralWorkouts(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'тренировка'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'тренировки'
  return 'тренировок'
}
