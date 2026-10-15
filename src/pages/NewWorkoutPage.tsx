import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Zap } from 'lucide-react'
import { useWorkoutsContext } from '@/hooks/WorkoutsContext'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'

// Быстрые подсказки названий — минимум ввода для частых тренировок.
const PRESETS = ['Грудь', 'Спина', 'Ноги', 'Руки', 'Плечи']

const schema = z.object({ name: z.string().trim().min(1, 'Введите название') })
type FormValues = z.infer<typeof schema>

export function NewWorkoutPage() {
  const { personId = '' } = useParams()
  const { createWorkout } = useWorkoutsContext()
  const navigate = useNavigate()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })
  const name = form.watch('name')

  function create(value: string) {
    const workout = createWorkout(personId, value)
    navigate(`/person/${personId}/workout/${workout.id}`, { replace: true })
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <PageHeader onBack={() => navigate(`/person/${personId}`)} />

      <h1 className="text-[34px] font-extrabold leading-tight tracking-tight sm:text-5xl">
        Новая тренировка
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => create(v.name))} className="flex flex-col gap-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Название</FormLabel>
                <FormControl>
                  <Input
                    className="h-14 text-lg font-semibold"
                    placeholder="Например, Грудь + трицепс"
                    autoFocus
                    enterKeyHint="done"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <Zap className="size-3.5" /> Быстрый выбор
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant="outline"
                  className="rounded-full px-5 hover:border-primary/60 hover:text-primary"
                  onClick={() => create(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          <Button type="submit" size="lg" disabled={!name.trim()}>
            <Plus /> Создать
          </Button>
        </form>
      </Form>
    </div>
  )
}
