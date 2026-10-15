import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExerciseItem } from './ExerciseItem'
import { ExercisePickerSheet } from './ExercisePickerSheet'
import { SetEditorSheet } from './SetEditorSheet'
import { BulkSetsSheet } from './BulkSetsSheet'
import type { SetMode } from './SetRow'
import { planOf } from '@/utils/sets'
import { useExerciseCatalogContext } from '@/hooks/ExerciseCatalogContext'
import { findCatalogEntry } from '@/utils/exercises'
import type { CatalogExercise, Exercise, SetPlan, WorkoutSet } from '@/types'

// Операции над упражнениями «владельца» (шаблона или выполненной тренировки).
// Сигнатуры совпадают у useWorkouts и useCompletedWorkouts.
export interface ExerciseOps {
  addExercise: (ownerId: string, name: string, catalogId?: string) => void
  updateExercise: (ownerId: string, exerciseId: string, name: string, catalogId?: string) => void
  deleteExercise: (ownerId: string, exerciseId: string) => void
  addSet: (ownerId: string, exerciseId: string) => void
  addSets: (ownerId: string, exerciseId: string, count: number, plan: SetPlan) => void
  updateSet: (
    ownerId: string,
    exerciseId: string,
    setId: string,
    patch: Partial<Omit<WorkoutSet, 'id'>>,
  ) => void
  deleteSet: (ownerId: string, exerciseId: string, setId: string) => void
}

interface Props {
  ownerId: string
  exercises: Exercise[]
  ops: ExerciseOps
  mode: SetMode // plan — шаблон (диапазоны), fact — выполненная тренировка
  defaultOpen?: boolean
  onRun?: (exerciseId: string) => void // свайп вправо — экран таймера
}

const EMPTY_PLAN: SetPlan = { weight: 0, reps: 10 }

// Маркер «выбор для нового упражнения» в состоянии пикера.
const NEW_EXERCISE = 'new'

// Список упражнений + добавление/замена упражнения через справочник.
export function ExerciseList({ ownerId, exercises, ops, mode, defaultOpen, onRun }: Props) {
  const { catalog } = useExerciseCatalogContext()
  // id упражнения, для которого открыт выбор, или NEW_EXERCISE; null — закрыт.
  const [pickingFor, setPickingFor] = useState<string | null>(null)
  const pickingExercise = exercises.find((e) => e.id === pickingFor)
  const [editing, setEditing] = useState<{ exerciseId: string; setId: string } | null>(null)
  const [bulkFor, setBulkFor] = useState<string | null>(null)

  const editingExercise = exercises.find((e) => e.id === editing?.exerciseId)
  const editingIndex = editingExercise?.sets.findIndex((s) => s.id === editing?.setId) ?? -1
  const bulkExercise = exercises.find((e) => e.id === bulkFor)
  const bulkLast = bulkExercise?.sets[bulkExercise.sets.length - 1]

  function onSaveSet(plan: SetPlan, applyToAll: boolean) {
    if (!editingExercise || !editing) return
    const targets = applyToAll ? editingExercise.sets : [editingExercise.sets[editingIndex]]
    for (const s of targets) ops.updateSet(ownerId, editingExercise.id, s.id, { ...plan })
    setEditing(null)
  }

  function onPick(entry: CatalogExercise) {
    if (pickingFor === NEW_EXERCISE) ops.addExercise(ownerId, entry.name, entry.id)
    else if (pickingFor) ops.updateExercise(ownerId, pickingFor, entry.name, entry.id)
    setPickingFor(null)
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {exercises.map((ex) => (
          <ExerciseItem
            key={ex.id}
            exercise={ex}
            mode={mode}
            defaultOpen={defaultOpen}
            onPickName={() => setPickingFor(ex.id)}
            onDelete={() => ops.deleteExercise(ownerId, ex.id)}
            onAddSet={() => ops.addSet(ownerId, ex.id)}
            onBulkAdd={() => setBulkFor(ex.id)}
            onEditSet={(setId) => setEditing({ exerciseId: ex.id, setId })}
            onUpdateSet={(setId, patch) => ops.updateSet(ownerId, ex.id, setId, patch)}
            onDeleteSet={(setId) => ops.deleteSet(ownerId, ex.id, setId)}
            onSwipeRight={onRun && (() => onRun(ex.id))}
          />
        ))}
      </div>

      <Button
        variant="outline"
        size="lg"
        className="w-full border-dashed text-muted-foreground hover:text-foreground"
        onClick={() => setPickingFor(NEW_EXERCISE)}
      >
        <Plus /> Упражнение
      </Button>

      <ExercisePickerSheet
        open={pickingFor !== null}
        onClose={() => setPickingFor(null)}
        selectedId={pickingExercise && findCatalogEntry(catalog, pickingExercise)?.id}
        onPick={onPick}
      />

      <SetEditorSheet
        set={editingIndex >= 0 ? editingExercise!.sets[editingIndex] : null}
        index={editingIndex}
        totalSets={editingExercise?.sets.length ?? 0}
        onClose={() => setEditing(null)}
        onSave={onSaveSet}
      />

      <BulkSetsSheet
        open={bulkExercise !== undefined}
        exerciseName={bulkExercise?.name ?? ''}
        initial={bulkLast ? planOf(bulkLast) : EMPTY_PLAN}
        onClose={() => setBulkFor(null)}
        onAdd={(count, plan) => {
          ops.addSets(ownerId, bulkFor!, count, plan)
          setBulkFor(null)
        }}
      />
    </>
  )
}
