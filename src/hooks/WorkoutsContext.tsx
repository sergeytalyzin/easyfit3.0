// Контекст, чтобы все страницы работали с одним и тем же состоянием тренировок.
import { createContext, useContext, type ReactNode } from 'react'
import { useWorkouts, type WorkoutsApi } from './useWorkouts'

const WorkoutsContext = createContext<WorkoutsApi | null>(null)

export function WorkoutsProvider({ children }: { children: ReactNode }) {
  const api = useWorkouts()
  return (
    <WorkoutsContext.Provider value={api}>{children}</WorkoutsContext.Provider>
  )
}

export function useWorkoutsContext(): WorkoutsApi {
  const ctx = useContext(WorkoutsContext)
  if (!ctx) {
    throw new Error('useWorkoutsContext должен использоваться внутри WorkoutsProvider')
  }
  return ctx
}
