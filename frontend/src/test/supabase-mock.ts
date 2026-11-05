/**
 * Minimal in-memory fake of the subset of the supabase-js query builder this
 * codebase actually uses (from/select/insert/update/upsert/delete/eq/neq/in/
 * not/order/maybeSingle/single, plus rpc and functions.invoke). Swapped in for
 * `@/lib/supabase-client` in tests via `vi.mock`, so repositories run against
 * real logic without a network call.
 *
 * Test helpers (prefixed `__`):
 *  - `__reset()` clears every table, recorded call and queued failure.
 *  - `__failNext(table, action, message?)` makes the next matching query
 *    resolve with an error, to exercise rollback/error paths.
 *  - `__invocations` records every `functions.invoke` call.
 *  - `__rpcCalls` records every `rpc` call.
 *  - `__store` exposes the raw rows (snake_case) for assertions.
 */

type Row = Record<string, unknown>
type Action = 'select' | 'insert' | 'update' | 'delete' | 'upsert'
type Filter =
  | { op: 'eq' | 'neq'; col: string; val: unknown }
  | { op: 'in'; col: string; val: unknown[] }
  | { op: 'not-is-null'; col: string }
type QueryResult = { data: unknown; error: { message: string } | null }
type FailureQueue = { table: string; action: Action; message: string }[]

class MockQueryBuilder implements PromiseLike<QueryResult> {
  private filters: Filter[] = []
  private singleMode: 'single' | 'maybeSingle' | null = null
  private store: Map<string, Row[]>
  private failures: FailureQueue
  private table: string
  private action: Action
  private payload?: Row | Row[]
  private upsertOptions?: { onConflict?: string }

  constructor(
    store: Map<string, Row[]>,
    failures: FailureQueue,
    table: string,
    action: Action,
    payload?: Row | Row[],
    upsertOptions?: { onConflict?: string },
  ) {
    this.store = store
    this.failures = failures
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

  in(column: string, values: unknown[]) {
    this.filters.push({ op: 'in', col: column, val: values })
    return this
  }

  not(column: string, operator: string, value: unknown) {
    if (operator !== 'is' || value !== null) {
      throw new Error(`Mock supabase: unsupported not(${column}, ${operator}, ${String(value)})`)
    }
    this.filters.push({ op: 'not-is-null', col: column })
    return this
  }

  order(_column: string, _options?: unknown) {
    return this
  }

  limit(_count: number) {
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
    return this.filters.every((f) => {
      switch (f.op) {
        case 'eq':
          return row[f.col] === f.val
        case 'neq':
          return row[f.col] !== f.val
        case 'in':
          return f.val.includes(row[f.col])
        case 'not-is-null':
          return row[f.col] !== null && row[f.col] !== undefined
      }
    })
  }

  private takeFailure(): string | null {
    const index = this.failures.findIndex((f) => f.table === this.table && f.action === this.action)
    if (index < 0) return null
    const [failure] = this.failures.splice(index, 1)
    return failure!.message
  }

  private execute(): QueryResult {
    const failure = this.takeFailure()
    if (failure) return { data: null, error: { message: failure } }

    const rows = this.store.get(this.table) ?? []
    let resultRows: Row[] = []

    if (this.action === 'select') {
      resultRows = rows.filter((r) => this.matches(r)).map((r) => ({ ...r }))
    } else if (this.action === 'insert') {
      const toInsert = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((r) => ({
        ...r,
      }))
      const duplicate = toInsert.find((r) => rows.some((existing) => existing.id !== undefined && existing.id === r.id))
      if (duplicate) {
        return { data: null, error: { message: `duplicate key value violates unique constraint (${this.table})` } }
      }
      rows.push(...toInsert)
      this.store.set(this.table, rows)
      resultRows = toInsert
    } else if (this.action === 'update') {
      // Like PostgREST, return the rows the filter matched *before* the
      // update was applied (now carrying their updated values).
      const matched = rows.filter((r) => this.matches(r))
      for (const row of matched) Object.assign(row, this.payload)
      resultRows = matched.map((r) => ({ ...r }))
    } else if (this.action === 'delete') {
      resultRows = rows.filter((r) => this.matches(r))
      const remaining = rows.filter((r) => !this.matches(r))
      this.store.set(this.table, remaining)
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

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }
}

export const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001'

export interface MockInvocation {
  name: string
  body: unknown
}

export interface MockRpcCall {
  fn: string
  args: unknown
}

export interface MockSupabaseClient {
  from: (table: string) => {
    select: (columns?: string) => MockQueryBuilder
    insert: (payload: Row | Row[]) => MockQueryBuilder
    update: (payload: Row) => MockQueryBuilder
    delete: () => MockQueryBuilder
    upsert: (payload: Row | Row[], options?: { onConflict?: string }) => MockQueryBuilder
  }
  rpc: (fn: string, args?: unknown) => Promise<QueryResult>
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null }; error: null }>
  }
  functions: {
    invoke: (name: string, options?: { body?: unknown }) => Promise<{ data: null; error: null }>
  }
  __reset: () => void
  __failNext: (table: string, action: Action, message?: string) => void
  __invocations: MockInvocation[]
  __rpcCalls: MockRpcCall[]
  __store: Map<string, Row[]>
}

export function createMockSupabaseClient(): MockSupabaseClient {
  const store = new Map<string, Row[]>()
  const failures: FailureQueue = []
  const invocations: MockInvocation[] = []
  const rpcCalls: MockRpcCall[] = []
  const rpcFailures: { fn: string; message: string }[] = []

  return {
    from(table: string) {
      return {
        select: (columns?: string) =>
          new MockQueryBuilder(store, failures, table, 'select', undefined).select(columns),
        insert: (payload: Row | Row[]) => new MockQueryBuilder(store, failures, table, 'insert', payload),
        update: (payload: Row) => new MockQueryBuilder(store, failures, table, 'update', payload),
        delete: () => new MockQueryBuilder(store, failures, table, 'delete'),
        upsert: (payload: Row | Row[], options?: { onConflict?: string }) =>
          new MockQueryBuilder(store, failures, table, 'upsert', payload, options),
      }
    },
    async rpc(fn: string, args?: unknown) {
      rpcCalls.push({ fn, args })
      const index = rpcFailures.findIndex((f) => f.fn === fn)
      if (index >= 0) {
        const [failure] = rpcFailures.splice(index, 1)
        return { data: null, error: { message: failure!.message } }
      }
      return { data: null, error: null }
    },
    auth: {
      async getUser() {
        return { data: { user: { id: MOCK_USER_ID } }, error: null }
      },
    },
    functions: {
      async invoke(name: string, options?: { body?: unknown }) {
        invocations.push({ name, body: options?.body })
        return { data: null, error: null }
      },
    },
    __reset() {
      store.clear()
      failures.length = 0
      invocations.length = 0
      rpcCalls.length = 0
      rpcFailures.length = 0
    },
    __failNext(table: string, action: Action, message = 'Simulated failure') {
      if (table.startsWith('rpc:')) rpcFailures.push({ fn: table.slice(4), message })
      else failures.push({ table, action, message })
    },
    __invocations: invocations,
    __rpcCalls: rpcCalls,
    __store: store,
  }
}
