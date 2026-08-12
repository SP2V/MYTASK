import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

interface SearchContextValue {
  query: string
  setQuery: (query: string) => void
  debouncedQuery: string
}

const SearchContext = createContext<SearchContextValue | null>(null)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 250)

  const value = useMemo(() => ({ query, setQuery, debouncedQuery }), [query, debouncedQuery])

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearch must be used within SearchProvider')
  return ctx
}
