// Хук с состоянием списка людей + операции CRUD.
// Автоматически сохраняет любые изменения в localStorage.

import { useCallback, useEffect, useState } from 'react'
import type { Person } from '../types'
import { loadFavorite, loadPeople, saveFavorite, savePeople } from '../utils/storage'
import { uid } from '../utils/id'

export function usePeople() {
  const [people, setPeople] = useState<Person[]>(() => loadPeople())
  const [favoriteId, setFavoriteId] = useState<string | null>(() => loadFavorite())

  useEffect(() => {
    savePeople(people)
  }, [people])

  useEffect(() => {
    saveFavorite(favoriteId)
  }, [favoriteId])

  const createPerson = useCallback(
    (name: string, avatar?: string | null): Person => {
      const person: Person = {
        id: uid(),
        name: name.trim() || 'Без имени',
        avatar: avatar ?? null,
        createdAt: new Date().toISOString(),
      }
      setPeople((prev) => [...prev, person])
      return person
    },
    [],
  )

  const updatePerson = useCallback(
    (id: string, patch: Partial<Omit<Person, 'id'>>) => {
      setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    },
    [],
  )

  const deletePerson = useCallback((id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id))
    // Если удалили основного — снимаем фаворита.
    setFavoriteId((cur) => (cur === id ? null : cur))
  }, [])

  // Назначить/снять основного человека. Фаворит всегда только один.
  const setFavorite = useCallback((id: string | null) => {
    setFavoriteId(id)
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteId((cur) => (cur === id ? null : id))
  }, [])

  return {
    people,
    favoriteId,
    createPerson,
    updatePerson,
    deletePerson,
    setFavorite,
    toggleFavorite,
  }
}

export type PeopleApi = ReturnType<typeof usePeople>
