import { Link } from 'react-router-dom'
import { Search, Settings, ListTodo, LogOut } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSearch } from '@/features/tasks/hooks/search-context'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { signOut } from '@/features/auth/services/auth-service'

export function Header() {
  const { query, setQuery } = useSearch()
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/40 bg-background/60 px-4 backdrop-blur-xl dark:border-white/10 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <ListTodo className="size-5 text-primary" aria-hidden="true" />
      </div>

      <div className="relative ml-auto flex max-w-sm flex-1 items-center md:ml-0">
        <Search
          className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks..."
          aria-label="Search tasks"
          className="pl-9"
        />
      </div>

      <Link
        to="/settings"
        aria-label="Settings"
        className="ml-auto flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground md:ml-0"
      >
        <Settings className="size-5" />
      </Link>

      {user && (
        <div className="hidden items-center gap-2 md:flex">
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="size-7 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <span className="max-w-[10rem] truncate text-sm text-muted-foreground">
            {user.email}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={() => void signOut()}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      )}
    </header>
  )
}
