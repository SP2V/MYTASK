import { QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * The data hooks (useTasks, useCategories, …) return only `data`, so without
 * this a failed load would just look like an endless empty/loading state.
 * Every query failure (after react-query's retries) surfaces as one toast;
 * the toast id is the query key so repeated failures don't stack up.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        console.error('Query failed', query.queryKey, error)
        toast.error('Unable to load your data. Check your connection and try again.', {
          id: `query-error:${JSON.stringify(query.queryKey)}`,
          description: error instanceof Error ? error.message : undefined,
        })
      },
    }),
  })
}
