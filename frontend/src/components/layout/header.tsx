import { Link } from 'react-router-dom'
import { Search, Settings, Sun, Moon, LogOut, CheckSquare2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSearch } from '@/features/tasks/hooks/search-context'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { signOut } from '@/features/auth/services/auth-service'
import { useTheme } from '@/features/settings/hooks/use-theme'

export function Header() {
  const { query, setQuery } = useSearch()
  const { user } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'LIGHT' : 'DARK')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl md:px-6">
      {/* Mobile Branding */}
      <div className="flex items-center gap-2.5 md:hidden">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CheckSquare2 className="size-4.5" aria-hidden="true" />
        </div>
        <span className="text-sm font-bold tracking-tight">Task Manager</span>
      </div>

      {/* Global Search Bar */}
      <div className="relative flex max-w-md flex-1 items-center">
        <Search
          className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Quick search tasks..."
          aria-label="Search tasks"
          className="h-9 w-full rounded-xl border-border/70 bg-muted/40 pl-9 pr-8 text-sm transition-all hover:bg-muted/70 focus:border-primary/50 focus:bg-background"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Quick Theme Switcher */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="size-9 rounded-lg text-muted-foreground transition-transform hover:scale-105 hover:bg-accent hover:text-foreground active:scale-95"
          onClick={toggleTheme}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="size-4.5 text-amber-400 transition-transform rotate-0 scale-100" />
          ) : (
            <Moon className="size-4.5 text-slate-700 transition-transform rotate-0 scale-100" />
          )}
        </Button>

        {/* Settings Shortcut */}
        <Link
          to="/settings"
          aria-label="Settings"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Settings className="size-4.5" />
        </Link>

        {/* User Profile */}
        {user && (
          <div className="hidden items-center gap-2 border-l border-border/60 pl-2 md:flex">
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-accent/40 py-1 pl-1 pr-3">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="size-6 rounded-full ring-1 ring-border"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary">
                  {user.email?.charAt(0).toUpperCase() ?? 'U'}
                </div>
              )}
              <span className="max-w-[8rem] truncate text-xs font-medium text-foreground">
                {user.email?.split('@')[0]}
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void signOut()}
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
