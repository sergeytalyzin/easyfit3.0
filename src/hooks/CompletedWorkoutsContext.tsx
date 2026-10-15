// Контекст, чтобы все страницы работали с одним списком выполненных тренировок.
import { createContext, useContext, type ReactNode } from 'react'
import {
  useCompletedWorkouts,
  type CompletedWorkoutsApi,
} from './useCompletedWorkouts'

const CompletedWorkoutsContext = createContext<CompletedWorkoutsApi | null>(null)

export function CompletedWorkoutsProvider({ children }: { children: ReactNode }) {
  const api = useCompletedWorkouts()
  return (
    <CompletedWorkoutsContext.Provider value={api}>
      {children}
    </CompletedWorkoutsContext.Provider>
  )
}

export function useCompletedWorkoutsContext(): CompletedWorkoutsApi {
  const ctx = useContext(CompletedWorkoutsContext)
  if (!ctx) {
    throw new Error(
      'useCompletedWorkoutsContext должен использоваться внутри CompletedWorkoutsProvider',
    )
  }
  return ctx
}
