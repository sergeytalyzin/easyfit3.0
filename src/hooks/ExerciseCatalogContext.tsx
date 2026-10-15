// Контекст, чтобы все страницы работали с одним справочником упражнений.
import { createContext, useContext, type ReactNode } from 'react'
import { useExerciseCatalog, type ExerciseCatalogApi } from './useExerciseCatalog'

const ExerciseCatalogContext = createContext<ExerciseCatalogApi | null>(null)

export function ExerciseCatalogProvider({ children }: { children: ReactNode }) {
  const api = useExerciseCatalog()
  return (
    <ExerciseCatalogContext.Provider value={api}>
      {children}
    </ExerciseCatalogContext.Provider>
  )
}

export function useExerciseCatalogContext(): ExerciseCatalogApi {
  const ctx = useContext(ExerciseCatalogContext)
  if (!ctx) {
    throw new Error(
      'useExerciseCatalogContext должен использоваться внутри ExerciseCatalogProvider',
    )
  }
  return ctx
}
