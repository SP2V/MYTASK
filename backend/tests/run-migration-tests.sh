#!/usr/bin/env bash
# Applies every migration in backend/supabase/migrations to a throwaway local
# Postgres (with Supabase stubs) and runs the SQL assertions in this folder.
#
#   bash backend/tests/run-migration-tests.sh
#
# Needs the Postgres server binaries (initdb, pg_ctl, postgres, psql) on PATH
# or in /usr/lib/postgresql/<version>/bin. No Docker or Supabase CLI required.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$HERE/../supabase/migrations"

if ! command -v initdb >/dev/null 2>&1; then
  PG_BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
  [ -n "$PG_BIN" ] && export PATH="$PG_BIN:$PATH"
fi
command -v initdb >/dev/null || { echo "initdb not found — install the PostgreSQL server" >&2; exit 1; }

WORK="$(mktemp -d)"
PORT="${PGTEST_PORT:-55432}"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  # Postgres refuses to run as root.
  id pgtest >/dev/null 2>&1 || useradd --system --no-create-home pgtest
  chown -R pgtest "$WORK"
  RUN_AS=(su pgtest -s /bin/bash -c)
else
  RUN_AS=(bash -c)
fi
cleanup() {
  "${RUN_AS[@]}" "pg_ctl -D '$WORK/data' -m immediate stop" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

"${RUN_AS[@]}" "PATH='$PATH' initdb -D '$WORK/data' -U postgres --auth=trust >/dev/null"
"${RUN_AS[@]}" "PATH='$PATH' pg_ctl -D '$WORK/data' -o '-p $PORT -k $WORK -c listen_addresses=' -l '$WORK/log' -w start >/dev/null"

PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h "$WORK" -p "$PORT" -U postgres -d postgres)
"${PSQL[@]}" -f "$HERE/supabase-stubs.sql"

for migration in "$MIGRATIONS"/*.sql; do
  # pg_cron / pg_net aren't available locally; cron.* is stubbed instead.
  sed -E '/create extension if not exists pg_(cron|net)/d' "$migration" | "${PSQL[@]}" >/dev/null
done
echo "Applied $(ls "$MIGRATIONS"/*.sql | wc -l) migrations"

for test in "$HERE"/*.test.sql; do
  echo "Running $(basename "$test")"
  "${PSQL[@]}" -f "$test"
done
echo "All migration tests passed"
