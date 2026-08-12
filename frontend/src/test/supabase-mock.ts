/**
 * Minimal in-memory fake of the subset of the supabase-js query builder this
 * codebase actually uses (from/select/insert/update/upsert/delete/eq/neq/
 * order/maybeSingle/single). Swapped in for `@/lib/supabase-client` in tests
 * via `vi.mock`, so repositories run against real logic without a network call.
 */

type Row = Record<string, unknown>
type Filter = { op: 'eq' | 'neq'; col: string; val: unknown }

class MockQueryBuilder implements PromiseLike<{ data: unknown; error: { message: string } | null }> {
  private filters: Filter[] = []
  private singleMode: 'single' | 'maybeSingle' | null = null
  private store: Map<string, Row[]>
  private table: string
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert'
  private payload?: Row | Row[]
  private upsertOptions?: { onConflict?: string }

  constructor(
    store: Map<string, Row[]>,
    table: string,
    action: 'select' | 'insert' | 'update' | 'delete' | 'upsert',
    payload?: Row | Row[],
    upsertOptions?: { onConflict?: string },
  ) {
    this.store = store
    this.table = table
    this.action = action
    this.payload = payload
    this.upsertOptions = upsertOptions
  }

  select(_columns?: string) {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: 'eq', col: column, val: value })
    return this
  }

  neq(column: string, value: unknown) {
    this.filters.push({ op: 'neq', col: column, val: value })
    return this
  }

  order(_column: string) {
    return this
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle'
    return this
  }

  single() {
    this.singleMode = 'single'
    return this
  }

  private matches(row: Row): boolean {
    return this.filters.every((f) => (f.op === 'eq' ? row[f.col] === f.val : row[f.col] !== f.val))
  }

  private execute(): { data: unknown; error: { message: string } | null } {
    const rows = this.store.get(this.table) ?? []
    let resultRows: Row[] = []

    if (this.action === 'select') {
      resultRows = rows.filter((r) => this.matches(r))
    } else if (this.action === 'insert') {
      const toInsert = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((r) => ({
        ...r,
      }))
      rows.push(...toInsert)
      this.store.set(this.table, rows)
      resultRows = toInsert
    } else if (this.action === 'update') {
      for (const row of rows) {
        if (this.matches(row)) Object.assign(row, this.payload)
      }
      resultRows = rows.filter((r) => this.matches(r))
    } else if (this.action === 'delete') {
      const remaining = rows.filter((r) => !this.matches(r))
      this.store.set(this.table, remaining)
      resultRows = []
    } else if (this.action === 'upsert') {
      const conflictCol = this.upsertOptions?.onConflict ?? 'id'
      const toUpsert = Array.isArray(this.payload) ? this.payload : [this.payload!]
      for (const item of toUpsert) {
        const idx = rows.findIndex((r) => r[conflictCol] === item[conflictCol])
        if (idx >= 0) rows[idx] = { ...rows[idx], ...item }
        else rows.push({ ...item })
      }
      this.store.set(this.table, rows)
      resultRows = toUpsert
    }

    let data: unknown = resultRows
    let error: { message: string } | null = null
    if (this.singleMode === 'single') {
      data = resultRows[0] ?? null
      if (!data) error = { message: 'No rows found' }
    } else if (this.singleMode === 'maybeSingle') {
      data = resultRows[0] ?? null
    }

    return { data, error }
  }

  then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }
}

export interface MockSupabaseClient {
  from: (table: string) => {
    select: (columns?: string) => MockQueryBuilder
    insert: (payload: Row | Row[]) => MockQueryBuilder
    update: (payload: Row) => MockQueryBuilder
    delete: () => MockQueryBuilder
    upsert: (payload: Row | Row[], options?: { onConflict?: string }) => MockQueryBuilder
  }
  __reset: () => void
}

export function createMockSupabaseClient(): MockSupabaseClient {
  const store = new Map<string, Row[]>()

  return {
    from(table: string) {
      return {
        select: (columns?: string) => new MockQueryBuilder(store, table, 'select', undefined).select(columns),
        insert: (payload: Row | Row[]) => new MockQueryBuilder(store, table, 'insert', payload),
        update: (payload: Row) => new MockQueryBuilder(store, table, 'update', payload),
        delete: () => new MockQueryBuilder(store, table, 'delete'),
        upsert: (payload: Row | Row[], options?: { onConflict?: string }) =>
          new MockQueryBuilder(store, table, 'upsert', payload, options),
      }
    },
    __reset() {
      store.clear()
    },
  }
}
