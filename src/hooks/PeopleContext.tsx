// Контекст, чтобы все страницы работали с одним и тем же списком людей.
import { createContext, useContext, type ReactNode } from 'react'
import { usePeople, type PeopleApi } from './usePeople'

const PeopleContext = createContext<PeopleApi | null>(null)

export function PeopleProvider({ children }: { children: ReactNode }) {
  const api = usePeople()
  return <PeopleContext.Provider value={api}>{children}</PeopleContext.Provider>
}

export function usePeopleContext(): PeopleApi {
  const ctx = useContext(PeopleContext)
  if (!ctx) {
    throw new Error('usePeopleContext должен использоваться внутри PeopleProvider')
  }
  return ctx
}
