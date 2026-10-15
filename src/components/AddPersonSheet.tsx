import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, UserPlus } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar } from './Avatar'
import { fileToAvatarDataUrl } from '@/utils/avatar'

interface Props {
  open: boolean
  onClose: () => void
  onCreate: (name: string, avatar: string | null) => void
}

const schema = z.object({ name: z.string().trim().min(1, 'Введите имя') })
type FormValues = z.infer<typeof schema>

export function AddPersonSheet({ open, onClose, onCreate }: Props) {
  const [avatar, setAvatar] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })
  const name = form.watch('name')

  // Каждое открытие — с чистой формы.
  useEffect(() => {
    if (open) {
      form.reset({ name: '' })
      setAvatar(null)
    }
  }, [open, form])

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setAvatar(await fileToAvatarDataUrl(file))
    } catch (err) {
      console.error(err)
    } finally {
      e.target.value = '' // позволяем выбрать тот же файл повторно
    }
  }

  function onSubmit(values: FormValues) {
    onCreate(values.name, avatar)
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader className="text-center">
          <DrawerTitle>Новый человек</DrawerTitle>
          <DrawerDescription>Для кого будем вести тренировки</DrawerDescription>
        </DrawerHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 px-5 pb-6 pt-2">
            <button
              type="button"
              className="group mx-auto flex flex-col items-center gap-2"
              onClick={() => fileRef.current?.click()}
            >
              <span className="relative">
                <Avatar name={name.trim() || '?'} avatar={avatar} size={92} />
                <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground">
                  <Camera className="size-3.5" />
                </span>
              </span>
              <span className="text-sm font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
                {avatar ? 'Изменить фото' : 'Добавить фото'}
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя</FormLabel>
                  <FormControl>
                    <Input placeholder="Например, Анна" enterKeyHint="done" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" size="lg" disabled={!name.trim()}>
              <UserPlus /> Добавить
            </Button>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  )
}
